-- =============================================================================
-- KA Tech — Ajuste da fila de indexação (rodar depois de 2026-10-28b)
--  1. Cria a coluna transcript_edited (faltou no banco).
--  2. Aula presa em "processing" volta à fila no máximo 3 vezes; depois fica
--     com erro explicando o motivo provável (vídeo longo demais para o tempo
--     da Edge Function), em vez de gastar cota do Gemini para sempre.
-- =============================================================================

begin;

alter table public.lessons
  add column if not exists transcript_edited boolean not null default false;

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

  -- Travadas que já esgotaram as tentativas viram erro (não voltam sozinhas)
  update public.lessons
  set index_status = 'error',
      index_error = 'A transcrição não terminou a tempo (' || index_attempts || ' tentativas). '
                 || 'Provável vídeo longo demais para o limite de tempo da Edge Function. '
                 || 'Cole a transcrição no painel "Ver transcrição" ou divida a aula.'
  where status = 'published'
    and index_status = 'processing'
    and index_attempts >= 3
    and index_requested_at < now() - interval '15 minutes';

  for r in
    select l.id
    from public.lessons l
    where l.status = 'published'
      and (
        (l.index_status = 'pending'
          and (l.index_requested_at is null or l.index_requested_at < now() - interval '2 minutes'))
        or (l.index_status = 'processing'
          and l.index_attempts < 3
          and (l.index_requested_at is null or l.index_requested_at < now() - interval '15 minutes'))
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

commit;
