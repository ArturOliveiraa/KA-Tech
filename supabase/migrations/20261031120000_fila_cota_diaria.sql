-- =============================================================================
-- KA Tech — Fila de indexação: erro de cota tenta 1 vez por dia, sem limite
-- Aplicada pelo GitHub Actions (supabase db push). Pode rodar de novo sem problema.
--
-- Antes: erro temporário era tentado de hora em hora, até 30 vezes. Com a cota
-- grátis do Gemini acabando cedo, as 30 tentativas se esgotavam e 42 aulas
-- ficaram paradas desde 29/10 ("Só pelo texto" e "Erro" no painel).
-- Agora:
--   • erro de cota (quota / exhausted / 429 / rate limit): uma tentativa por
--     dia, logo depois que a cota zera (meia-noite do Pacífico, ~4h/5h em
--     Brasília), sem limite de tentativas. Tentar antes disso não adianta.
--   • outros erros temporários (sobrecarga, 503, timeout): de hora em hora,
--     até 30 tentativas, como antes.
-- =============================================================================

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
  -- Começo do dia da cota do Gemini (meia-noite no horário do Pacífico)
  v_quota_day timestamptz := date_trunc('day', now() at time zone 'America/Los_Angeles') at time zone 'America/Los_Angeles';
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
          and (
            -- cota: 1 vez por dia, depois que ela zera
            (l.index_error ilike any (array['%quota%', '%exhausted%', '%429%', '%rate%'])
              and (l.index_requested_at is null or l.index_requested_at < v_quota_day))
            or
            -- sobrecarga e afins: de hora em hora, até 30 vezes
            (l.index_error not ilike all (array['%quota%', '%exhausted%', '%429%', '%rate%'])
              and l.index_error ilike any (array[
                '%503%', '%500%', '%overloaded%', '%unavailable%', '%timeout%', '%deadline%',
                '%demand%', '%try again%', '%temporar%'
              ])
              and l.index_attempts < 30
              and (l.index_requested_at is null or l.index_requested_at < now() - interval '60 minutes'))
          ))
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


-- =============================================================================
-- Conferir (aulas que a fila vai pegar depois que a cota zerar):
--   select count(*) from lessons
--   where status = 'published' and index_error ilike '%quota%'
--     and (index_status = 'error' or transcript_source = 'texto');
-- =============================================================================
