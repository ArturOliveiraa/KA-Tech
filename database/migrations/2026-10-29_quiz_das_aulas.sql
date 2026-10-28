-- =============================================================================
-- KA Tech — Quiz da aula (gerado pela IA a partir da transcrição, revisado pela equipe)
-- Rodar no SQL Editor, num bloco só.
--
--  1. Apaga o quiz antigo (havia 1, sem aula) e as tentativas dele.
--  2. Um quiz por aula, com rascunho/publicado; perguntas com ordem,
--     explicação e o segundo do vídeo onde a resposta aparece.
--  3. Segurança: antes qualquer aluno logado podia editar ou apagar quizzes
--     e ler as respostas certas. Agora só a equipe edita; o aluno recebe as
--     perguntas sem o gabarito e a nota é calculada no banco.
--  4. Funções: get_lesson_quiz (aluno abre), submit_lesson_quiz (aluno
--     responde), save_lesson_quiz (equipe salva tudo de uma vez).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Limpa o quiz antigo
-- -----------------------------------------------------------------------------
delete from public.quiz_attempts;
delete from public.options;
delete from public.questions;
delete from public.quizzes;

-- -----------------------------------------------------------------------------
-- 2. Estrutura
-- -----------------------------------------------------------------------------
alter table public.quizzes
  add column if not exists status text not null default 'draft',
  add column if not exists generated_by text,           -- 'ia' ou null (manual)
  add column if not exists updated_at timestamptz not null default now();

alter table public.quizzes drop constraint if exists quizzes_status_check;
alter table public.quizzes add constraint quizzes_status_check check (status in ('draft', 'published'));

-- Um quiz por aula
create unique index if not exists quizzes_lesson_unique on public.quizzes (lesson_id) where lesson_id is not null;

alter table public.questions
  add column if not exists position integer not null default 1,
  add column if not exists explanation text,
  add column if not exists start_seconds integer;

alter table public.options
  add column if not exists position integer not null default 1;

alter table public.quiz_attempts
  add column if not exists answers jsonb;

-- Chaves estrangeiras com exclusão em cascata (as antigas, se existirem, são trocadas)
do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tbl, c.conname
    from pg_constraint c
    where c.contype = 'f'
      and (c.conrelid, c.conkey) in (
        select a.attrelid, array[a.attnum]
        from pg_attribute a
        where (a.attrelid = 'public.questions'::regclass and a.attname = 'quiz_id')
           or (a.attrelid = 'public.options'::regclass and a.attname = 'question_id')
           or (a.attrelid = 'public.quiz_attempts'::regclass and a.attname = 'quiz_id')
           or (a.attrelid = 'public.quizzes'::regclass and a.attname = 'lesson_id')
      )
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end $$;

alter table public.questions
  alter column quiz_id set not null,
  add constraint questions_quiz_id_fkey foreign key (quiz_id) references public.quizzes(id) on delete cascade;
alter table public.options
  alter column question_id set not null,
  add constraint options_question_id_fkey foreign key (question_id) references public.questions(id) on delete cascade;
alter table public.quiz_attempts
  add constraint quiz_attempts_quiz_id_fkey foreign key (quiz_id) references public.quizzes(id) on delete cascade;
alter table public.quizzes
  add constraint quizzes_lesson_id_fkey foreign key (lesson_id) references public.lessons(id) on delete cascade;

create index if not exists questions_quiz_idx on public.questions (quiz_id, position);
create index if not exists options_question_idx on public.options (question_id, position);
create index if not exists quiz_attempts_user_quiz_idx on public.quiz_attempts (user_id, quiz_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 3. Permissões
-- -----------------------------------------------------------------------------
drop policy if exists "Liberar Geral para Logados - Quizzes" on public.quizzes;
drop policy if exists "Liberar Geral para Logados - Questions" on public.questions;
drop policy if exists "Liberar Geral para Logados - Options" on public.options;

alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.options enable row level security;
alter table public.quiz_attempts enable row level security;

-- Aluno vê que o quiz existe (para mostrar o botão); perguntas e gabarito só pela função
drop policy if exists quizzes_read on public.quizzes;
create policy quizzes_read on public.quizzes
  for select to authenticated
  using (public.is_staff() or status = 'published');

drop policy if exists quizzes_staff_write on public.quizzes;
create policy quizzes_staff_write on public.quizzes
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists questions_staff on public.questions;
create policy questions_staff on public.questions
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists options_staff on public.options;
create policy options_staff on public.options
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Tentativas: o aluno vê as suas, a equipe vê todas; gravar só pela função
drop policy if exists quiz_attempts_read on public.quiz_attempts;
create policy quiz_attempts_read on public.quiz_attempts
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- -----------------------------------------------------------------------------
-- 4. Funções
-- -----------------------------------------------------------------------------

-- Quiz publicado da aula, sem o gabarito, com a última tentativa do aluno
create or replace function public.get_lesson_quiz(p_lesson_id integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_quiz public.quizzes;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Faça login para abrir o quiz.';
  end if;

  select q.* into v_quiz
  from public.quizzes q
  join public.lessons l on l.id = q.lesson_id
  where q.lesson_id = p_lesson_id
    and (public.is_staff() or (q.status = 'published' and l.status = 'published'));

  if v_quiz.id is null then
    return null;
  end if;

  select jsonb_build_object(
    'id', v_quiz.id,
    'title', v_quiz.title,
    'description', v_quiz.description,
    'min_score', coalesce(v_quiz.min_score, 70),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', qu.id,
        'content', qu.content,
        'options', (
          select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'content', o.content) order by o.position, o.id), '[]'::jsonb)
          from public.options o where o.question_id = qu.id
        )
      ) order by qu.position, qu.created_at)
      from public.questions qu where qu.quiz_id = v_quiz.id
    ), '[]'::jsonb),
    'last_attempt', (
      select jsonb_build_object('score', a.score, 'passed', a.passed, 'created_at', a.created_at)
      from public.quiz_attempts a
      where a.quiz_id = v_quiz.id and a.user_id = auth.uid()
      order by a.created_at desc limit 1
    ),
    'best_score', (
      select max(a.score) from public.quiz_attempts a
      where a.quiz_id = v_quiz.id and a.user_id = auth.uid()
    )
  ) into v_result;

  return v_result;
end;
$$;

-- Corrige as respostas ({"<question_id>": "<option_id>", ...}), grava a tentativa
-- e devolve o gabarito com a explicação e o minuto do vídeo de cada pergunta
create or replace function public.submit_lesson_quiz(p_quiz_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz public.quizzes;
  v_total integer;
  v_correct integer;
  v_score integer;
  v_passed boolean;
  v_review jsonb;
begin
  if auth.uid() is null then
    raise exception 'Faça login para responder o quiz.';
  end if;

  select q.* into v_quiz
  from public.quizzes q
  join public.lessons l on l.id = q.lesson_id
  where q.id = p_quiz_id
    and (public.is_staff() or (q.status = 'published' and l.status = 'published'));
  if v_quiz.id is null then
    raise exception 'Quiz não encontrado.';
  end if;

  -- Evita gravar várias tentativas por clique repetido
  if exists (
    select 1 from public.quiz_attempts
    where quiz_id = p_quiz_id and user_id = auth.uid() and created_at > now() - interval '5 seconds'
  ) then
    raise exception 'Aguarde um instante antes de enviar de novo.';
  end if;

  select
    count(*),
    count(*) filter (where o.is_correct),
    jsonb_agg(jsonb_build_object(
      'question_id', qu.id,
      'chosen_option_id', o.id,
      'correct_option_id', (
        select c.id from public.options c
        where c.question_id = qu.id and c.is_correct
        order by c.position limit 1
      ),
      'is_correct', coalesce(o.is_correct, false),
      'explanation', qu.explanation,
      'start_seconds', qu.start_seconds
    ) order by qu.position, qu.created_at)
  into v_total, v_correct, v_review
  from public.questions qu
  left join public.options o
    on o.question_id = qu.id
   and o.id::text = p_answers ->> qu.id::text
  where qu.quiz_id = p_quiz_id;

  if v_total = 0 then
    raise exception 'Este quiz ainda não tem perguntas.';
  end if;

  v_score := round(v_correct * 100.0 / v_total);
  v_passed := v_score >= coalesce(v_quiz.min_score, 70);

  insert into public.quiz_attempts (user_id, quiz_id, score, passed, answers)
  values (auth.uid(), p_quiz_id, v_score, v_passed, p_answers);

  return jsonb_build_object(
    'score', v_score,
    'passed', v_passed,
    'correct', v_correct,
    'total', v_total,
    'min_score', coalesce(v_quiz.min_score, 70),
    'review', v_review
  );
end;
$$;

-- Equipe salva o quiz inteiro de uma vez (cria ou substitui as perguntas).
-- p_quiz: {title, description, min_score, status, generated_by,
--          questions: [{content, explanation, start_seconds,
--                       options: [{content, is_correct}]}]}
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
  if not public.is_staff() then
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

revoke all on function public.get_lesson_quiz(integer) from public, anon;
revoke all on function public.submit_lesson_quiz(uuid, jsonb) from public, anon;
revoke all on function public.save_lesson_quiz(integer, jsonb) from public, anon;
grant execute on function public.get_lesson_quiz(integer) to authenticated;
grant execute on function public.submit_lesson_quiz(uuid, jsonb) to authenticated;
grant execute on function public.save_lesson_quiz(integer, jsonb) to authenticated;

commit;

-- =============================================================================
-- CONFERIR
-- =============================================================================
--   select column_name from information_schema.columns
--   where table_name = 'questions' and column_name in ('explanation', 'start_seconds', 'position');
--   -> 3 linhas
--   select policyname from pg_policies where tablename in ('quizzes','questions','options','quiz_attempts');
--   -> quizzes_read, quizzes_staff_write, questions_staff, options_staff, quiz_attempts_read
