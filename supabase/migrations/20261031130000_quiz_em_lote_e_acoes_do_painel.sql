-- =============================================================================
-- KA Tech — Quizzes em lote e ações em lote no painel "Busca e indexação"
--  1. Fila "rascunhar-quizzes": aula com o vídeo transcrito e sem quiz ganha um
--     rascunho gerado pela IA (Edge Function generate-quiz, modelo leve). A
--     equipe revisa e publica na aba "Quizzes" do painel. Nada vai para o aluno
--     sem revisão.
--  2. save_lesson_quiz aceita a service role (a Edge Function grava o rascunho).
--  3. admin_retry_index_bulk: transcrever de novo todas com erro / só pelo texto,
--     ou refazer todos os resumos.
--  4. Buscas sem resposta ganham situação: "pauta" ou "ignorada" (somem da lista
--     de abertas).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Rascunhos de quiz
-- -----------------------------------------------------------------------------
alter table public.lessons
  add column if not exists quiz_draft_attempts integer not null default 0,
  add column if not exists quiz_draft_requested_at timestamptz,
  add column if not exists quiz_draft_error text;

create or replace function public.draft_quizzes_queue(batch_size integer default 1)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
  v_sent integer := 0;
  r record;
begin
  -- Mesmo segredo e endereço da indexação, trocando o nome da função
  select replace(decrypted_secret, '/index-lesson', '/generate-quiz') into v_url
  from vault.decrypted_secrets where name = 'index_lesson_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'index_lesson_secret';
  if v_url is null or v_secret is null then
    raise warning 'Fila de quizzes: segredos index_lesson_url/index_lesson_secret ausentes no Vault';
    return 0;
  end if;

  for r in
    select l.id
    from public.lessons l
    where l.status = 'published'
      and l.index_status = 'done'
      -- Só com o vídeo transcrito (ou transcrição revisada): o texto do cadastro é curto demais
      and (l.transcript_source like 'gemini%' or l.transcript_edited)
      and not exists (select 1 from public.quizzes q where q.lesson_id = l.id)
      and l.quiz_draft_attempts < 3
      and (l.quiz_draft_requested_at is null or l.quiz_draft_requested_at < now() - interval '30 minutes')
    order by l.quiz_draft_requested_at nulls first, l.id
    limit greatest(1, least(batch_size, 5))
    for update skip locked
  loop
    update public.lessons
    set quiz_draft_requested_at = now(),
        quiz_draft_attempts = quiz_draft_attempts + 1
    where id = r.id;

    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-index-secret', v_secret),
      body := jsonb_build_object('lesson_id', r.id, 'save', true),
      timeout_milliseconds := 10000
    );
    v_sent := v_sent + 1;
  end loop;

  return v_sent;
end;
$$;

revoke all on function public.draft_quizzes_queue(integer) from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'rascunhar-quizzes';
select cron.schedule('rascunhar-quizzes', '*/2 * * * *', $$select public.draft_quizzes_queue(1)$$);

-- Rascunhos esperando revisão (aba "Quizzes" do painel)
create or replace function public.admin_quiz_drafts()
returns table (
  quiz_id uuid,
  lesson_id integer,
  lesson_title text,
  course_id integer,
  course_title text,
  generated_by text,
  questions integer,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Apenas a equipe pode ver os quizzes.';
  end if;
  return query
  select q.id, l.id, l.title::text, c.id, c.title::text, q.generated_by,
         (select count(*)::integer from public.questions qq where qq.quiz_id = q.id),
         q.updated_at
  from public.quizzes q
  join public.lessons l on l.id = q.lesson_id
  join public.courses c on c.id = l.course_id
  where q.status = 'draft' and l.status = 'published'
  order by c.title, l.id;
end;
$$;

revoke all on function public.admin_quiz_drafts() from public, anon;
grant execute on function public.admin_quiz_drafts() to authenticated;

-- -----------------------------------------------------------------------------
-- 2. save_lesson_quiz: equipe ou a Edge Function (service role)
-- -----------------------------------------------------------------------------
create or replace function public.save_lesson_quiz(p_lesson_id integer, p_quiz jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lesson public.lessons;
  v_quiz_id uuid;
  v_question_id uuid;
  q jsonb;
  o jsonb;
  qi integer := 0;
  oi integer;
  v_status text := coalesce(p_quiz ->> 'status', 'draft');
begin
  if not (public.is_staff() or coalesce(auth.role(), '') = 'service_role') then
    raise exception 'Apenas a equipe pode editar quizzes.';
  end if;

  select * into v_lesson from public.lessons where id = p_lesson_id;
  if v_lesson.id is null then
    raise exception 'Aula não encontrada.';
  end if;

  if v_status not in ('draft', 'published') then
    raise exception 'Status inválido.';
  end if;

  if jsonb_typeof(p_quiz -> 'questions') is distinct from 'array' or jsonb_array_length(p_quiz -> 'questions') = 0 then
    raise exception 'O quiz precisa de pelo menos uma pergunta.';
  end if;

  -- Cada pergunta: texto, ao menos 2 alternativas e exatamente 1 certa
  for q in select * from jsonb_array_elements(p_quiz -> 'questions') loop
    if length(trim(coalesce(q ->> 'content', ''))) = 0 then
      raise exception 'Há uma pergunta sem texto.';
    end if;
    if jsonb_array_length(coalesce(q -> 'options', '[]'::jsonb)) < 2 then
      raise exception 'A pergunta "%" precisa de pelo menos 2 alternativas.', left(q ->> 'content', 60);
    end if;
    if (select count(*) from jsonb_array_elements(q -> 'options') x where (x ->> 'is_correct')::boolean) <> 1 then
      raise exception 'A pergunta "%" precisa de exatamente 1 alternativa certa.', left(q ->> 'content', 60);
    end if;
    if exists (select 1 from jsonb_array_elements(q -> 'options') x where length(trim(coalesce(x ->> 'content', ''))) = 0) then
      raise exception 'A pergunta "%" tem uma alternativa vazia.', left(q ->> 'content', 60);
    end if;
  end loop;

  insert into public.quizzes (lesson_id, course_id, title, description, min_score, status, generated_by, updated_at)
  values (
    p_lesson_id,
    v_lesson.course_id,
    coalesce(nullif(trim(p_quiz ->> 'title'), ''), 'Quiz: ' || v_lesson.title),
    nullif(trim(p_quiz ->> 'description'), ''),
    least(100, greatest(0, coalesce((p_quiz ->> 'min_score')::integer, 70))),
    v_status,
    p_quiz ->> 'generated_by',
    now()
  )
  on conflict (lesson_id) where lesson_id is not null do update
    set title = excluded.title,
        description = excluded.description,
        min_score = excluded.min_score,
        status = excluded.status,
        generated_by = coalesce(excluded.generated_by, public.quizzes.generated_by),
        course_id = excluded.course_id,
        updated_at = now()
  returning id into v_quiz_id;

  delete from public.questions where quiz_id = v_quiz_id;

  for q in select * from jsonb_array_elements(p_quiz -> 'questions') loop
    qi := qi + 1;
    insert into public.questions (quiz_id, content, explanation, start_seconds, position)
    values (
      v_quiz_id,
      trim(q ->> 'content'),
      nullif(trim(coalesce(q ->> 'explanation', '')), ''),
      case when q ->> 'start_seconds' ~ '^\d+$' then (q ->> 'start_seconds')::integer end,
      qi
    )
    returning id into v_question_id;

    oi := 0;
    for o in select * from jsonb_array_elements(q -> 'options') loop
      oi := oi + 1;
      insert into public.options (question_id, content, is_correct, position)
      values (v_question_id, trim(o ->> 'content'), coalesce((o ->> 'is_correct')::boolean, false), oi);
    end loop;
  end loop;

  return v_quiz_id;
end;
$$;

revoke all on function public.save_lesson_quiz(integer, jsonb) from public, anon;
grant execute on function public.save_lesson_quiz(integer, jsonb) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. Ações em lote
--    'erro'   → aulas com erro voltam para a fila
--    'texto'  → aulas só pelo texto tentam transcrever o vídeo de novo
--    'resumo' → todos os resumos são refeitos (fila resumir-aulas)
-- -----------------------------------------------------------------------------
create or replace function public.admin_retry_index_bulk(p_target text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_staff() then
    raise exception 'Apenas a equipe pode reindexar aulas.';
  end if;

  if p_target = 'resumo' then
    update public.lessons
    set summary_embedding = null, summary_attempts = 0, summary_requested_at = null
    where status = 'published' and index_status = 'done';
  elsif p_target in ('erro', 'texto') then
    update public.lessons
    set index_status = 'pending', index_error = null, index_attempts = 0,
        index_requested_at = null, transcript_progress = null
    where status = 'published'
      and case p_target
            when 'erro' then index_status = 'error'
            else index_status = 'done' and transcript_source = 'texto' and not transcript_edited
          end;
  else
    raise exception 'Ação desconhecida: %', p_target;
  end if;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.admin_retry_index_bulk(text) from public, anon;
grant execute on function public.admin_retry_index_bulk(text) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Situação das buscas sem resposta
-- -----------------------------------------------------------------------------
create table if not exists public.search_gap_status (
  norm       text primary key,
  status     text not null check (status in ('pauta', 'ignorada')),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.search_gap_status enable row level security;
drop policy if exists search_gap_status_staff on public.search_gap_status;
create policy search_gap_status_staff on public.search_gap_status
  for select to authenticated using (public.is_staff());

create or replace function public.admin_set_gap_status(p_norm text, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Apenas a equipe pode alterar as buscas.';
  end if;
  if p_status is null then
    delete from public.search_gap_status where norm = p_norm;
  else
    insert into public.search_gap_status (norm, status, updated_by)
    values (p_norm, p_status, auth.uid())
    on conflict (norm) do update set status = excluded.status, updated_by = excluded.updated_by, updated_at = now();
  end if;
end;
$$;

revoke all on function public.admin_set_gap_status(text, text) from public, anon;
grant execute on function public.admin_set_gap_status(text, text) to authenticated;

-- A forma do retorno muda (norm e status), então a função é recriada
drop function if exists public.admin_search_gaps(integer);

create function public.admin_search_gaps(p_days integer default 30, p_status text default 'abertas')
returns table (
  norm text,
  query text,
  searches integer,
  people integer,
  no_results integer,
  no_click integer,
  last_at timestamptz,
  status text
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_staff() then
    raise exception 'Apenas a equipe pode ver as buscas.';
  end if;
  return query
  with base as (
    select s.*,
           regexp_replace(lower(trim(s.query)), '\s+', ' ', 'g') as n
    from public.search_logs s
    where s.created_at > now() - make_interval(days => greatest(1, least(p_days, 365)))
  ),
  grouped as (
    select b.n,
           (array_agg(b.query order by b.created_at desc))[1] as q,
           count(*)::integer as total,
           count(distinct b.user_id)::integer as ppl,
           count(*) filter (where b.result_count = 0)::integer as zero,
           count(*) filter (where b.result_count > 0 and b.clicked_lesson_id is null)::integer as noclick,
           max(b.created_at) as last
    from base b
    group by b.n
    having count(*) filter (where b.result_count = 0 or b.clicked_lesson_id is null) > 0
  )
  select g.n, g.q, g.total, g.ppl, g.zero, g.noclick, g.last, st.status
  from grouped g
  left join public.search_gap_status st on st.norm = g.n
  where case p_status
          when 'abertas' then st.status is null
          else st.status = p_status
        end
  order by g.zero desc, g.total desc, g.last desc
  limit 200;
end;
$$;

revoke all on function public.admin_search_gaps(integer, text) from public, anon;
grant execute on function public.admin_search_gaps(integer, text) to authenticated;
