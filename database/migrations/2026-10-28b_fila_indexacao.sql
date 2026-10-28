-- =============================================================================
-- KA Tech — Fila de indexação das aulas (busca semântica)
-- RASCUNHO: ainda NÃO aplicado. Rodar no SQL Editor, num bloco só, DEPOIS de
-- 2026-10-28_busca_semantica_aulas.sql.
--
-- A cada minuto o banco pega até 2 aulas que precisam de indexação e chama a
-- Edge Function index-lesson. Assim as aulas já publicadas são transcritas
-- sozinhas, sem clicar uma a uma, e falhas temporárias são tentadas de novo.
--
-- Entra na fila:
--   • aula publicada com status "pending" (inclusive as 77 já existentes);
--   • aula presa em "processing" há mais de 15 min (função caiu no meio);
--   • aula com erro TEMPORÁRIO do Gemini (cota, limite, sobrecarga), no
--     máximo a cada 60 min e até 10 tentativas. Erros definitivos, como vídeo
--     não listado, não são repetidos: corrija a aula e ela volta sozinha.
-- =============================================================================

begin;

create extension if not exists pg_cron;

alter table public.lessons
  add column if not exists index_attempts integer not null default 0,
  add column if not exists index_requested_at timestamptz;

-- Ao marcar para indexar (publicar/editar), zera as tentativas e anota a hora.
-- A hora evita que a fila chame de novo uma aula que o gatilho acabou de chamar.
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
      new.index_attempts := 0;
      new.index_requested_at := now();
    end if;
  elsif tg_op = 'INSERT' or old.status is distinct from new.status then
    new.index_status := 'skipped';
  end if;
  return new;
end;
$$;

-- Processa um lote da fila. Devolve quantas aulas foram enviadas.
create or replace function public.index_lessons_queue(batch_size integer default 2)
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
    raise warning 'Fila de indexação: segredos index_lesson_url/index_lesson_secret ausentes no Vault';
    return 0;
  end if;

  for r in
    select l.id
    from public.lessons l
    where l.status = 'published'
      and (
        -- pendente (o gatilho já chamou há mais de 2 min ou nunca chamou)
        (l.index_status = 'pending'
          and (l.index_requested_at is null or l.index_requested_at < now() - interval '2 minutes'))
        -- travada no meio
        or (l.index_status = 'processing'
          and (l.index_requested_at is null or l.index_requested_at < now() - interval '15 minutes'))
        -- erro temporário do Gemini
        or (l.index_status = 'error'
          and l.index_attempts < 10
          and (l.index_requested_at is null or l.index_requested_at < now() - interval '60 minutes')
          and l.index_error ilike any (array[
            '%quota%', '%exhausted%', '%rate%', '%429%', '%503%', '%500%',
            '%overloaded%', '%unavailable%', '%timeout%', '%deadline%'
          ]))
      )
    order by l.index_requested_at nulls first, l.id
    limit greatest(1, least(batch_size, 10))
    for update skip locked
  loop
    -- Atualiza só colunas de controle: não dispara os gatilhos de conteúdo
    update public.lessons
    set index_status = 'processing',
        index_requested_at = now(),
        index_attempts = index_attempts + 1
    where id = r.id;

    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-index-secret', v_secret),
      body := jsonb_build_object('lesson_id', r.id),
      timeout_milliseconds := 10000
    );
    v_sent := v_sent + 1;
  end loop;

  return v_sent;
end;
$$;

revoke all on function public.index_lessons_queue(integer) from public, anon, authenticated;

-- Agenda: a cada minuto, até 2 aulas (respeita o limite de requisições do Gemini)
select cron.unschedule(jobid) from cron.job where jobname = 'indexar-aulas';
select cron.schedule('indexar-aulas', '* * * * *', $$select public.index_lessons_queue(2)$$);

commit;

-- =============================================================================
-- ACOMPANHAR
-- =============================================================================
-- Situação geral:
--   select index_status, count(*) from public.lessons where status = 'published' group by 1 order by 1;
--
-- Erros (com o motivo):
--   select id, title, index_attempts, index_error from public.lessons
--   where index_status = 'error' order by id;
--
-- Últimas execuções do agendador:
--   select status, return_message, start_time from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'indexar-aulas')
--   order by start_time desc limit 10;
--
-- Pausar / retomar:
--   select cron.alter_job((select jobid from cron.job where jobname = 'indexar-aulas'), active := false);
--   select cron.alter_job((select jobid from cron.job where jobname = 'indexar-aulas'), active := true);
--
-- =============================================================================
-- DESFAZER
-- =============================================================================
-- begin;
-- select cron.unschedule(jobid) from cron.job where jobname = 'indexar-aulas';
-- drop function if exists public.index_lessons_queue(integer);
-- alter table public.lessons drop column if exists index_requested_at, drop column if exists index_attempts;
-- commit;
-- (o gatilho lessons_mark_for_index continua funcionando sem essas colunas
--  apenas se for recriado pela versão de 2026-10-28_busca_semantica_aulas.sql)
