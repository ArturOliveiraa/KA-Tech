-- =============================================================================
-- KA Tech — Fila de indexação: mais erros temporários do Gemini (rodar depois de 2026-10-28c)
--  1. "high demand" / "try again later" (modelo sobrecarregado) passa a ser
--     tentado de novo; antes ficava parado como erro definitivo.
--  2. Até 30 tentativas (1 por hora) em vez de 10: a cota grátis do Gemini
--     (20 transcrições por dia) só volta à meia-noite do horário do Pacífico,
--     e 10 tentativas acabavam antes disso.
--  3. Aula que ficou "Na busca" só com o texto do admin, porque o Gemini
--     estava sobrecarregado, volta à fila para transcrever o vídeo. Continua
--     aparecendo na busca pelo texto enquanto espera.
--  4. transcript_progress: lives longas são transcritas em partes de 30 min;
--     aqui fica o que já foi transcrito, para continuar de onde parou.
-- =============================================================================

begin;

alter table public.lessons
  add column if not exists transcript_progress jsonb;

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
        -- erro temporário do Gemini; inclui a aula que entrou na busca só pelo
        -- texto porque o vídeo não pôde ser transcrito naquela hora
        or ((l.index_status = 'error'
             or (l.index_status = 'done' and l.transcript_source = 'texto' and not l.transcript_edited))
          and l.index_attempts < 30
          and (l.index_requested_at is null or l.index_requested_at < now() - interval '60 minutes')
          and l.index_error ilike any (array[
            '%quota%', '%exhausted%', '%rate%', '%429%', '%503%', '%500%',
            '%overloaded%', '%unavailable%', '%timeout%', '%deadline%',
            '%demand%', '%try again%', '%temporar%'
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
