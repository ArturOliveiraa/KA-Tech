-- =============================================================================
-- KA Tech — Vetor da aula inteira na busca (rodar depois de 2026-10-29)
--  1. Cada aula ganha um resumo do assunto (feito pela IA a partir da
--     transcrição) e um vetor desse resumo. O vetor de cada trecho continua.
--  2. A busca junta os dois: 60% o vetor da aula, 40% o melhor trecho, mais
--     um pequeno bônus quando as palavras da pergunta aparecem na aula.
--     Assim, uma aula SOBRE o assunto ganha de uma que só o cita num trecho.
--  3. Fila "resumir-aulas": a cada minuto, resume até 5 aulas já indexadas
--     que ainda não têm o vetor da aula. Usa a transcrição salva; não
--     transcreve o vídeo de novo.
-- =============================================================================

begin;

alter table public.lessons
  add column if not exists summary text,
  add column if not exists summary_embedding vector(768),
  add column if not exists summary_requested_at timestamptz,
  add column if not exists summary_attempts integer not null default 0;

create index if not exists lessons_summary_embedding_idx
  on public.lessons using hnsw (summary_embedding vector_cosine_ops);

-- -----------------------------------------------------------------------------
-- Busca: vetor da aula + melhor trecho + palavras. Um resultado por aula.
-- SECURITY INVOKER: as regras de acesso de lessons valem para quem busca.
-- -----------------------------------------------------------------------------
drop function if exists public.search_lesson_chunks(vector, text, integer);

create function public.search_lesson_chunks(
  query_embedding vector(768),
  query_text text,
  match_count integer default 8
)
returns table (
  lesson_id integer,
  course_id integer,
  lesson_title text,
  course_title text,
  course_slug text,
  start_seconds integer,
  content text,
  similarity double precision,
  lesson_summary text
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with q as (
    select websearch_to_tsquery('portuguese', coalesce(query_text, '')) as tsq
  ),
  by_lesson as (
    select l.id, 1 - (l.summary_embedding <=> query_embedding) as sim
    from lessons l
    where l.summary_embedding is not null and l.status = 'published'
    order by l.summary_embedding <=> query_embedding
    limit 40
  ),
  by_chunk as (
    select c.lesson_id as id
    from lesson_chunks c
    order by c.embedding <=> query_embedding
    limit 60
  ),
  by_word as (
    select distinct c.lesson_id as id
    from lesson_chunks c, q
    where c.fts @@ q.tsq
  ),
  candidates as (
    select id from by_lesson
    union select id from by_chunk
    union select id from by_word
  ),
  scored as (
    select l.id as lesson_id,
           l.course_id,
           l.title,
           l.summary,
           best.start_seconds,
           best.content,
           best.sim as chunk_sim,
           case when l.summary_embedding is null then best.sim
                else 1 - (l.summary_embedding <=> query_embedding) end as lesson_sim,
           exists (
             select 1 from lesson_chunks c2, q
             where c2.lesson_id = l.id and c2.fts @@ q.tsq
           ) or to_tsvector('portuguese', l.title) @@ (select tsq from q) as word_hit
    from candidates cand
    join lessons l on l.id = cand.id and l.status = 'published'
    cross join lateral (
      select c.start_seconds, c.content, 1 - (c.embedding <=> query_embedding) as sim
      from lesson_chunks c
      where c.lesson_id = l.id
      order by c.embedding <=> query_embedding
      limit 1
    ) best
  )
  select s.lesson_id, s.course_id, s.title, co.title, co.slug,
         s.start_seconds, s.content,
         (0.6 * s.lesson_sim + 0.4 * s.chunk_sim + case when s.word_hit then 0.03 else 0 end)::double precision,
         s.summary
  from scored s
  join courses co on co.id = s.course_id
  order by 8 desc
  limit greatest(1, least(match_count, 20));
$$;

revoke all on function public.search_lesson_chunks(vector, text, integer) from public;
grant execute on function public.search_lesson_chunks(vector, text, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- Fila do resumo: aulas indexadas sem vetor da aula
-- -----------------------------------------------------------------------------
create or replace function public.summarize_lessons_queue(batch_size integer default 5)
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
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'index_lesson_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'index_lesson_secret';
  if v_url is null or v_secret is null then
    raise warning 'Fila de resumo: segredos index_lesson_url/index_lesson_secret ausentes no Vault';
    return 0;
  end if;

  for r in
    select l.id
    from public.lessons l
    where l.status = 'published'
      and l.index_status = 'done'
      and l.summary_embedding is null
      and l.summary_attempts < 10
      and (l.summary_requested_at is null or l.summary_requested_at < now() - interval '30 minutes')
    order by l.summary_requested_at nulls first, l.id
    limit greatest(1, least(batch_size, 10))
    for update skip locked
  loop
    update public.lessons
    set summary_requested_at = now(),
        summary_attempts = summary_attempts + 1
    where id = r.id;

    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-index-secret', v_secret),
      body := jsonb_build_object('lesson_id', r.id, 'only', 'summary'),
      timeout_milliseconds := 10000
    );
    v_sent := v_sent + 1;
  end loop;

  return v_sent;
end;
$$;

revoke all on function public.summarize_lessons_queue(integer) from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'resumir-aulas';
select cron.schedule('resumir-aulas', '* * * * *', $$select public.summarize_lessons_queue(5)$$);

commit;

-- =============================================================================
-- Acompanhar:
--   select count(*) filter (where summary_embedding is not null) as com_vetor,
--          count(*) filter (where summary_embedding is null) as sem_vetor
--   from lessons where status = 'published' and index_status = 'done';
--
-- DESFAZER (volta a busca só por trechos: rodar de novo o bloco 3 de
-- 2026-10-28_busca_semantica_aulas.sql depois de apagar a função):
--   select cron.unschedule(jobid) from cron.job where jobname = 'resumir-aulas';
--   drop function if exists public.summarize_lessons_queue(integer);
-- =============================================================================
