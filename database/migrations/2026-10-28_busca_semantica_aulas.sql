-- =============================================================================
-- KA Tech — Busca semântica de aulas (transcrição pelo Gemini + pgvector)
-- RASCUNHO: ainda NÃO aplicado. Rodar no SQL Editor do Supabase, num bloco só.
--
-- Como funciona:
--   1. Aula publicada (ou com título/vídeo/texto alterado) fica "pending".
--   2. Um gatilho chama a Edge Function index-lesson (pg_net, assíncrono).
--   3. A função transcreve o vídeo com o Gemini, divide em trechos com o
--      segundo de início, gera os vetores e grava em lesson_chunks.
--   4. A busca (Edge Function search-lessons → search_lesson_chunks) junta
--      busca por significado (vetor) e por palavra (texto em português).
--
-- Quem pode ver o quê: um trecho só aparece para quem consegue ver a aula
-- (as regras de acesso de lessons/courses já valem dentro da busca, inclusive
-- o filtro de rascunhos).
--
-- ANTES DE RODAR, criar os dois segredos no Vault (ver guia SETUP no fim).
-- =============================================================================

begin;

-- A extensão já existe neste banco (usada por aula_embeddings), no esquema public.
-- Por isso os tipos abaixo não indicam esquema: valem onde a extensão estiver.
create extension if not exists vector;

-- -----------------------------------------------------------------------------
-- 1. Status da indexação em cada aula
--    "transcript" guarda o texto gerado pela IA. Não usamos o campo content
--    para não disparar uma nova indexação ao gravar a transcrição.
-- -----------------------------------------------------------------------------
alter table public.lessons
  add column if not exists index_status text not null default 'pending',
  add column if not exists index_error text,
  add column if not exists indexed_at timestamptz,
  add column if not exists transcript text,
  add column if not exists transcript_source text;

alter table public.lessons drop constraint if exists lessons_index_status_check;
alter table public.lessons
  add constraint lessons_index_status_check
  check (index_status in ('pending', 'processing', 'done', 'error', 'skipped'));

-- -----------------------------------------------------------------------------
-- 2. Trechos indexados (um registro por trecho de ~1 a 2 minutos)
-- -----------------------------------------------------------------------------
create table if not exists public.lesson_chunks (
  id            bigint generated always as identity primary key,
  lesson_id     integer not null references public.lessons(id) on delete cascade,
  course_id     integer not null references public.courses(id) on delete cascade,
  chunk_index   integer not null,
  start_seconds integer not null default 0,
  end_seconds   integer,
  content       text not null,
  embedding     vector(768) not null,
  fts           tsvector generated always as (to_tsvector('portuguese', content)) stored,
  created_at    timestamptz not null default now(),
  unique (lesson_id, chunk_index)
);

create index if not exists lesson_chunks_embedding_idx
  on public.lesson_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists lesson_chunks_fts_idx on public.lesson_chunks using gin (fts);
create index if not exists lesson_chunks_lesson_idx on public.lesson_chunks (lesson_id);

alter table public.lesson_chunks enable row level security;

-- Lê o trecho quem consegue ver a aula (a RLS de lessons decide). Gravação só
-- pela Edge Function, que usa a service role e não depende destas políticas.
drop policy if exists lesson_chunks_read on public.lesson_chunks;
create policy lesson_chunks_read on public.lesson_chunks
  for select to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_chunks.lesson_id));

-- -----------------------------------------------------------------------------
-- 3. Busca híbrida (vetor + palavra), um resultado por aula (o melhor trecho)
--    SECURITY INVOKER: roda com as permissões de quem busca.
-- -----------------------------------------------------------------------------
create or replace function public.search_lesson_chunks(
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
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with semantic as (
    select c.id,
           row_number() over (order by c.embedding <=> query_embedding) as rnk,
           1 - (c.embedding <=> query_embedding) as sim
    from lesson_chunks c
    order by c.embedding <=> query_embedding
    limit 40
  ),
  keyword as (
    select c.id,
           row_number() over (order by ts_rank_cd(c.fts, q) desc) as rnk
    from lesson_chunks c, websearch_to_tsquery('portuguese', coalesce(query_text, '')) q
    where c.fts @@ q
    order by ts_rank_cd(c.fts, q) desc
    limit 40
  ),
  fused as (
    -- Reciprocal Rank Fusion: soma as posições das duas buscas
    select coalesce(s.id, k.id) as id,
           coalesce(1.0 / (60 + s.rnk), 0) + coalesce(1.0 / (60 + k.rnk), 0) as score,
           s.sim
    from semantic s
    full outer join keyword k on k.id = s.id
  ),
  best as (
    select distinct on (ch.lesson_id)
           ch.lesson_id, ch.course_id, ch.start_seconds, ch.content, f.score, f.sim
    from fused f
    join lesson_chunks ch on ch.id = f.id
    order by ch.lesson_id, f.score desc
  )
  select b.lesson_id, b.course_id, l.title, co.title, co.slug,
         b.start_seconds, b.content, coalesce(b.sim, 0)::double precision
  from best b
  join lessons l on l.id = b.lesson_id
  join courses co on co.id = b.course_id
  where l.status = 'published'
  order by b.score desc
  limit greatest(1, least(match_count, 20));
$$;

revoke all on function public.search_lesson_chunks(vector, text, integer) from public;
grant execute on function public.search_lesson_chunks(vector, text, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Gatilhos: marca para indexar e chama a Edge Function
-- -----------------------------------------------------------------------------

-- 4a. Antes de gravar: decide o status (só olha campos que mudam o conteúdo)
create or replace function public.lessons_mark_for_index()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'published' then
    if tg_op = 'INSERT'
       or old.status is distinct from new.status
       or old.title is distinct from new.title
       or old."videoUrl" is distinct from new."videoUrl"
       or old.content is distinct from new.content then
      new.index_status := 'pending';
      new.index_error := null;
    end if;
  elsif tg_op = 'INSERT' or old.status is distinct from new.status then
    new.index_status := 'skipped';
  end if;
  return new;
end;
$$;

drop trigger if exists lessons_mark_for_index on public.lessons;
create trigger lessons_mark_for_index
  before insert or update of status, title, "videoUrl", content on public.lessons
  for each row execute function public.lessons_mark_for_index();

-- 4b. Depois de gravar: chama a indexação ou limpa os trechos do rascunho
create or replace function public.lessons_request_index()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
begin
  if new.status <> 'published' then
    delete from public.lesson_chunks where lesson_id = new.id;
    return null;
  end if;

  if new.index_status <> 'pending' then
    return null;
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'index_lesson_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'index_lesson_secret';

  if v_url is null or v_secret is null then
    raise warning 'Indexação não configurada: crie index_lesson_url e index_lesson_secret no Vault';
    return null;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-index-secret', v_secret),
    body := jsonb_build_object('lesson_id', new.id),
    timeout_milliseconds := 10000
  );
  return null;
end;
$$;

drop trigger if exists lessons_request_index on public.lessons;
create trigger lessons_request_index
  after insert or update of status, title, "videoUrl", content on public.lessons
  for each row execute function public.lessons_request_index();

-- O gatilho antigo mandava a aula como "pergunta" para a função de busca e
-- não gravava nada. Fica substituído pelos de cima.
drop trigger if exists ao_inserir_aula on public.lessons;
drop function if exists public.gatilho_nova_aula();

-- Aulas já publicadas entram na fila (o admin dispara pelo botão "Indexar
-- pendentes" ou o SQL do guia; este UPDATE não chama a função sozinho).
update public.lessons
set index_status = case when status = 'published' then 'pending' else 'skipped' end
where index_status = 'pending' or index_status is null;

commit;

-- =============================================================================
-- SETUP (uma vez, antes de rodar este arquivo)
--
-- 1) Gere um segredo aleatório (ex.: no terminal: openssl rand -hex 32).
-- 2) No SQL Editor, crie os segredos do Vault (troque os valores):
--      select vault.create_secret('https://zvgchncgvadzpkffhfbr.supabase.co/functions/v1/index-lesson', 'index_lesson_url');
--      select vault.create_secret('<SEGREDO_GERADO>', 'index_lesson_secret');
-- 3) Nas Edge Functions (painel → Edge Functions → Secrets), crie:
--      GEMINI_API_KEY        = chave do Google AI Studio
--      INDEX_LESSON_SECRET   = o mesmo <SEGREDO_GERADO>
--    Opcionais: GEMINI_TRANSCRIBE_MODEL (padrão gemini-3.6-flash),
--               GEMINI_EMBED_MODEL (padrão gemini-embedding-2)
-- 4) Publique as funções (pasta supabase/functions do repositório):
--      supabase functions deploy index-lesson --no-verify-jwt
--      supabase functions deploy search-lessons
--
-- Reindexar tudo depois (opcional, pelo SQL Editor):
--   update public.lessons set index_status = 'pending' where status = 'published';
--   e então use o botão "Indexar pendentes" no admin de cada curso.
-- =============================================================================

-- =============================================================================
-- DESFAZER
-- =============================================================================
-- begin;
-- drop trigger if exists lessons_request_index on public.lessons;
-- drop trigger if exists lessons_mark_for_index on public.lessons;
-- drop function if exists public.lessons_request_index();
-- drop function if exists public.lessons_mark_for_index();
-- drop function if exists public.search_lesson_chunks(vector, text, integer);
-- drop table if exists public.lesson_chunks;
-- alter table public.lessons drop constraint if exists lessons_index_status_check;
-- alter table public.lessons
--   drop column if exists transcript_source, drop column if exists transcript,
--   drop column if exists indexed_at, drop column if exists index_error,
--   drop column if exists index_status;
-- commit;
