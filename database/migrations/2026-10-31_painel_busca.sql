-- =============================================================================
-- KA Tech — Painel "Busca e indexação" no admin (rodar depois de 2026-10-30c)
--  1. gemini_usage: quantas chamadas ao Gemini por dia e modelo. O dia segue o
--     horário do Pacífico, que é quando a cota grátis do Google zera.
--     As Edge Functions somam por bump_gemini_usage (só a service role).
--  2. search_logs: cada pergunta da pandAI, quantas aulas voltaram e em qual
--     o aluno clicou. Base do relatório "Buscas sem resposta".
--  3. Funções do admin (só equipe): resumo da indexação, lista de aulas,
--     "tentar de novo" e as buscas sem resposta.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Uso do Gemini
-- -----------------------------------------------------------------------------
create table if not exists public.gemini_usage (
  day          date not null,
  model        text not null,
  requests     integer not null default 0,
  quota_errors integer not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (day, model)
);

alter table public.gemini_usage enable row level security;
drop policy if exists gemini_usage_staff on public.gemini_usage;
create policy gemini_usage_staff on public.gemini_usage
  for select to authenticated using (public.is_staff());

create or replace function public.bump_gemini_usage(p_model text, p_quota_error boolean default false)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.gemini_usage as g (day, model, requests, quota_errors)
  values ((now() at time zone 'America/Los_Angeles')::date, left(p_model, 80),
          case when p_quota_error then 0 else 1 end,
          case when p_quota_error then 1 else 0 end)
  on conflict (day, model) do update
    set requests = g.requests + excluded.requests,
        quota_errors = g.quota_errors + excluded.quota_errors,
        updated_at = now();
$$;

revoke all on function public.bump_gemini_usage(text, boolean) from public, anon, authenticated;
grant execute on function public.bump_gemini_usage(text, boolean) to service_role;

-- -----------------------------------------------------------------------------
-- 2. Registro das buscas
-- -----------------------------------------------------------------------------
create table if not exists public.search_logs (
  id                bigint generated always as identity primary key,
  user_id           uuid references auth.users(id) on delete set null,
  query             text not null,
  result_count      integer not null default 0,
  lesson_ids        integer[] not null default '{}',
  ranked_by         text,
  clicked_lesson_id integer,
  clicked_at        timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists search_logs_created_idx on public.search_logs (created_at desc);

alter table public.search_logs enable row level security;
-- A equipe lê tudo; o aluno só as próprias (o insert com retorno do id precisa disso)
drop policy if exists search_logs_read on public.search_logs;
create policy search_logs_read on public.search_logs
  for select to authenticated using (user_id = auth.uid() or public.is_staff());
-- O aluno grava a própria busca (pela Edge Function, com o login dele)
drop policy if exists search_logs_insert_own on public.search_logs;
create policy search_logs_insert_own on public.search_logs
  for insert to authenticated with check (user_id = auth.uid());

-- Clique num resultado: só na própria busca e só em aula que estava na lista
create or replace function public.log_search_click(p_search_id bigint, p_lesson_id integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.search_logs
  set clicked_lesson_id = p_lesson_id, clicked_at = now()
  where id = p_search_id
    and user_id = auth.uid()
    and p_lesson_id = any (lesson_ids)
    and clicked_lesson_id is null;
$$;

revoke all on function public.log_search_click(bigint, integer) from public, anon;
grant execute on function public.log_search_click(bigint, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Funções do painel (só equipe)
-- -----------------------------------------------------------------------------

-- Aulas publicadas com o estado da indexação
create or replace function public.admin_index_lessons()
returns table (
  id integer,
  title text,
  course_id integer,
  course_title text,
  course_slug text,
  index_status text,
  transcript_source text,
  index_error text,
  index_attempts integer,
  indexed_at timestamptz,
  has_summary boolean,
  summary_attempts integer,
  live_progress integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Apenas a equipe pode ver a indexação.';
  end if;
  return query
  select l.id, l.title::text, l.course_id, c.title::text, c.slug::text,
         l.index_status, l.transcript_source, l.index_error, l.index_attempts,
         l.indexed_at, l.summary_embedding is not null, l.summary_attempts,
         (l.transcript_progress->>'next')::integer
  from public.lessons l
  join public.courses c on c.id = l.course_id
  where l.status = 'published'
  order by c.title, l.id;
end;
$$;

revoke all on function public.admin_index_lessons() from public, anon;
grant execute on function public.admin_index_lessons() to authenticated;

-- "Tentar de novo": mode 'full' refaz a transcrição; 'summary' só o resumo.
-- A fila (indexar-aulas / resumir-aulas) pega a aula no próximo minuto.
create or replace function public.admin_retry_index(p_lesson_id integer, p_mode text default 'full')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Apenas a equipe pode reindexar aulas.';
  end if;
  if p_mode = 'summary' then
    update public.lessons
    set summary_embedding = null, summary_attempts = 0, summary_requested_at = null
    where id = p_lesson_id;
  else
    update public.lessons
    set index_status = 'pending', index_error = null, index_attempts = 0,
        index_requested_at = null, transcript_progress = null
    where id = p_lesson_id and status = 'published';
  end if;
end;
$$;

revoke all on function public.admin_retry_index(integer, text) from public, anon;
grant execute on function public.admin_retry_index(integer, text) to authenticated;

-- Buscas sem resposta: nenhuma aula voltou, ou voltou e ninguém clicou.
-- Agrupa a mesma pergunta (sem diferença de maiúsculas/acentos/espaços).
create or replace function public.admin_search_gaps(p_days integer default 30)
returns table (
  query text,
  searches integer,
  people integer,
  no_results integer,
  no_click integer,
  last_at timestamptz
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
           regexp_replace(lower(trim(s.query)), '\s+', ' ', 'g') as norm
    from public.search_logs s
    where s.created_at > now() - make_interval(days => greatest(1, least(p_days, 365)))
  )
  select (array_agg(b.query order by b.created_at desc))[1],
         count(*)::integer,
         count(distinct b.user_id)::integer,
         count(*) filter (where b.result_count = 0)::integer,
         count(*) filter (where b.result_count > 0 and b.clicked_lesson_id is null)::integer,
         max(b.created_at)
  from base b
  group by b.norm
  having count(*) filter (where b.result_count = 0 or b.clicked_lesson_id is null) > 0
  order by count(*) filter (where b.result_count = 0) desc, count(*) desc, max(b.created_at) desc
  limit 200;
end;
$$;

revoke all on function public.admin_search_gaps(integer) from public, anon;
grant execute on function public.admin_search_gaps(integer) to authenticated;

commit;

-- =============================================================================
-- Conferir:
--   select to_regclass('public.gemini_usage'), to_regclass('public.search_logs');
-- =============================================================================
