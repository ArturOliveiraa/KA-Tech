-- =============================================================================
-- KA Tech — Módulos, rascunho/publicado e anexos de aula
-- RASCUNHO: ainda NÃO aplicado. Rodar no SQL Editor do Supabase (em staging
-- primeiro), num único bloco. É idempotente: pode rodar de novo sem quebrar.
--
-- Tipos conferidos com o schema enviado em 18/10/2026:
--   courses.id e lessons.id = integer; lessons."order" e "videoUrl" com aspas.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 0. Quem é equipe (admin/professor). Usado nas políticas abaixo.
--    SECURITY DEFINER para ler profiles sem depender da RLS de profiles.
-- -----------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) in ('admin', 'teacher', 'professor')
  );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

-- -----------------------------------------------------------------------------
-- 1. Módulos do curso
--    Aula sem módulo (module_id nulo) continua funcionando: aparece em
--    "Sem módulo" no topo. Nada muda para os cursos atuais.
-- -----------------------------------------------------------------------------
create table if not exists public.course_modules (
  id          bigint generated always as identity primary key,
  course_id   integer not null references public.courses(id) on delete cascade,
  title       text   not null check (length(trim(title)) > 0),
  "order"     integer not null default 1,
  created_at  timestamptz not null default now()
);

create index if not exists course_modules_course_order_idx
  on public.course_modules (course_id, "order");

alter table public.lessons
  add column if not exists module_id bigint
  references public.course_modules(id) on delete set null;

create index if not exists lessons_module_idx on public.lessons (module_id);

-- O módulo precisa ser do mesmo curso da aula
create or replace function public.lessons_module_same_course()
returns trigger
language plpgsql
as $$
begin
  if new.module_id is not null and not exists (
    select 1 from public.course_modules m
    where m.id = new.module_id and m.course_id = new.course_id
  ) then
    raise exception 'O módulo % não pertence ao curso %', new.module_id, new.course_id;
  end if;
  return new;
end;
$$;

drop trigger if exists lessons_module_same_course on public.lessons;
create trigger lessons_module_same_course
  before insert or update of module_id, course_id on public.lessons
  for each row execute function public.lessons_module_same_course();

alter table public.course_modules enable row level security;

drop policy if exists course_modules_read on public.course_modules;
create policy course_modules_read on public.course_modules
  for select to authenticated using (true);

drop policy if exists course_modules_write on public.course_modules;
create policy course_modules_write on public.course_modules
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- -----------------------------------------------------------------------------
-- 2. Rascunho / publicado (por aula)
--    Padrão 'published': todas as aulas atuais continuam visíveis.
--    Política RESTRITIVA: soma-se às políticas que já existem em lessons
--    (sem precisar conhecê-las) e esconde rascunhos de quem não é equipe.
-- -----------------------------------------------------------------------------
alter table public.lessons
  add column if not exists status text not null default 'published';

alter table public.lessons drop constraint if exists lessons_status_check;
alter table public.lessons
  add constraint lessons_status_check check (status in ('draft', 'published'));

alter table public.lessons
  add column if not exists published_at timestamptz;

update public.lessons set published_at = coalesce(published_at, now())
  where status = 'published' and published_at is null;

create index if not exists lessons_course_status_idx on public.lessons (course_id, status);

drop policy if exists lessons_hide_drafts on public.lessons;
create policy lessons_hide_drafts on public.lessons
  as restrictive
  for select to authenticated
  using (status = 'published' or public.is_staff());

-- -----------------------------------------------------------------------------
-- 3. Anexos / materiais da aula
--    Arquivo no Storage (bucket privado lesson-materials) e metadados aqui.
--    Caminho no bucket: <course_id>/<lesson_id>/<arquivo>
-- -----------------------------------------------------------------------------
create table if not exists public.lesson_attachments (
  id          bigint generated always as identity primary key,
  lesson_id   integer not null references public.lessons(id) on delete cascade,
  name        text   not null,
  file_path   text   not null unique,
  mime_type   text,
  size_bytes  bigint check (size_bytes is null or size_bytes >= 0),
  "order"     integer not null default 1,
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists lesson_attachments_lesson_idx
  on public.lesson_attachments (lesson_id, "order");

alter table public.lesson_attachments enable row level security;

-- Lê o anexo quem consegue ver a aula (a política de rascunho já filtra)
drop policy if exists lesson_attachments_read on public.lesson_attachments;
create policy lesson_attachments_read on public.lesson_attachments
  for select to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id));

drop policy if exists lesson_attachments_write on public.lesson_attachments;
create policy lesson_attachments_write on public.lesson_attachments
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Bucket privado, 25 MB por arquivo, tipos comuns de material
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-materials', 'lesson-materials', false, 26214400,
  array[
    'application/pdf',
    'application/zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',
    'image/png', 'image/jpeg', 'image/webp'
  ]
)
on conflict (id) do nothing;

drop policy if exists lesson_materials_read on storage.objects;
create policy lesson_materials_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'lesson-materials'
    and exists (
      select 1 from public.lesson_attachments a
      where a.file_path = storage.objects.name
    )
  );

drop policy if exists lesson_materials_write on storage.objects;
create policy lesson_materials_write on storage.objects
  for all to authenticated
  using (bucket_id = 'lesson-materials' and public.is_staff())
  with check (bucket_id = 'lesson-materials' and public.is_staff());

-- -----------------------------------------------------------------------------
-- 4. Rankings: expor o id do usuário (coluna nova no fim, como o Postgres exige
--    em "create or replace view"). O front passa a achar "Sua posição" pelo id
--    em vez de comparar nome + foto. O cálculo de cada view não muda.
--    Rascunhos não afetam essas views: elas só contam o que o aluno concluiu.
-- -----------------------------------------------------------------------------
create or replace view public.ranking_badges as
 select p.full_name,
    p.avatar_url,
    coalesce(count(ub.id), 0::bigint) as total_badges,
    p.id as user_id
   from profiles p
     left join user_badges ub on p.id = ub.user_id
  group by p.id, p.full_name, p.avatar_url
  order by coalesce(count(ub.id), 0::bigint) desc, p.full_name;

create or replace view public.ranking_maratonistas as
 select p.full_name,
    p.avatar_url,
    coalesce(count(up.id) filter (where up.is_completed = true), 0::bigint) as lessons_completed,
    p.id as user_id
   from profiles p
     left join user_progress up on p.id = up.user_id
  group by p.id, p.full_name, p.avatar_url
  order by coalesce(count(up.id) filter (where up.is_completed = true), 0::bigint) desc, p.full_name;

create or replace view public.ranking_on_fire as
 with user_dates as (
         select distinct user_progress.user_id,
            date(user_progress.completed_at) as activity_date
           from user_progress
          where user_progress.is_completed = true
        ), groups as (
         select user_dates.user_id,
            user_dates.activity_date,
            user_dates.activity_date - (row_number() over (partition by user_dates.user_id order by user_dates.activity_date))::double precision * '1 day'::interval as grp
           from user_dates
        ), streaks as (
         select groups.user_id,
            count(*) as streak_length
           from groups
          group by groups.user_id, groups.grp
        )
 select p.full_name,
    p.avatar_url,
    coalesce(max(s.streak_length), 0::bigint) as active_days,
    p.id as user_id
   from profiles p
     left join streaks s on p.id = s.user_id
  group by p.id, p.full_name, p.avatar_url
  order by coalesce(max(s.streak_length), 0::bigint) desc, p.full_name;

create or replace view public.ranking_tempo_voo as
 select p.full_name,
    p.avatar_url,
    coalesce(round((sum(up.last_time) / 60.0::double precision)::numeric, 1), 0::numeric) as total_time_spent,
    p.id as user_id
   from profiles p
     left join user_progress up on p.id = up.user_id
  group by p.id, p.full_name, p.avatar_url
  order by coalesce(round((sum(up.last_time) / 60.0::double precision)::numeric, 1), 0::numeric) desc, p.full_name;

create or replace view public.ranking_xp as
 select p.full_name,
    p.avatar_url,
    coalesce(sum(h.xp_earned), 0::bigint) as total_xp,
        case
            when sum(h.xp_earned) >= 30000 then 'Panda Supremo! 🐼'::text
            when sum(h.xp_earned) >= 26501 then 'Panda Ancestral'::text
            when sum(h.xp_earned) >= 22001 then 'Panda Erudito'::text
            when sum(h.xp_earned) >= 17501 then 'Panda Mestre'::text
            when sum(h.xp_earned) >= 13501 then 'Panda Guerreiro'::text
            when sum(h.xp_earned) >= 9501 then 'Panda Guardião'::text
            when sum(h.xp_earned) >= 6001 then 'Panda Escalador'::text
            when sum(h.xp_earned) >= 3001 then 'Panda de Bambu'::text
            when sum(h.xp_earned) >= 1001 then 'Panda Explorador'::text
            else 'Panda Broto'::text
        end as rank_name,
    p.id as user_id
   from profiles p
     left join xp_history h on h.user_id = p.id
  group by p.id, p.full_name, p.avatar_url
  order by coalesce(sum(h.xp_earned), 0::bigint) desc;

-- -----------------------------------------------------------------------------
-- 5. Funções que contam aulas passam a considerar só as publicadas
--    (SECURITY DEFINER ignora a RLS, então o filtro precisa estar aqui).
-- -----------------------------------------------------------------------------

-- 5a. Conclusão de curso → insígnia (e, pelo gatilho on_badge_earned, XP)
--     Mudanças além do filtro de publicadas:
--     * sai cedo quando a linha não está concluída: o player grava progresso a
--       cada segundo e antes cada gravação refazia as duas contagens;
--     * só conta progresso de aulas que ainda existem (user_progress.lesson_id
--       não tem chave estrangeira, então sobravam linhas de aulas apagadas);
--     * NOT EXISTS em vez de depender de ON CONFLICT, que só funciona se houver
--       índice único em user_badges(user_id, badge_id).
create or replace function public.check_course_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_total_lessons integer;
  v_completed_lessons integer;
  v_badge_id bigint;
begin
  if not coalesce(new.is_completed, false) then
    return new;
  end if;

  select count(*) into v_total_lessons
  from public.lessons
  where course_id = new.course_id
    and status = 'published';

  select count(*) into v_completed_lessons
  from public.user_progress up
  join public.lessons l on l.id = up.lesson_id
  where up.user_id = new.user_id
    and up.course_id = new.course_id
    and up.is_completed = true
    and l.status = 'published';

  if v_total_lessons > 0 and v_completed_lessons >= v_total_lessons then
    select id into v_badge_id from public.badges where course_id = new.course_id;

    if v_badge_id is not null and not exists (
      select 1 from public.user_badges ub
      where ub.user_id = new.user_id and ub.badge_id = v_badge_id
    ) then
      insert into public.user_badges (user_id, badge_id)
      values (new.user_id, v_badge_id);
    end if;
  end if;

  return new;
end;
$function$;

-- 5b. Dashboard do aluno: duração e progresso só com aulas publicadas
create or replace function public.get_user_dashboard()
returns table(id integer, title text, slug text, "thumbnailUrl" text, "totalDuration" double precision, "enrolledAt" timestamp without time zone, progress integer)
language plpgsql
security definer
set search_path = public
as $function$
begin
  return query
  with
  my_enrollments as (
    select "courseId", "createdAt"
    from course_enrollments
    where "userId" = auth.uid()
  ),
  course_totals as (
    select l.course_id, coalesce(sum(l.duration * 60), 0) as total_seconds
    from lessons l
    where l.course_id in (select "courseId" from my_enrollments)
      and l.status = 'published'
    group by l.course_id
  ),
  user_stats as (
    select
      up.course_id,
      sum(
        case
          when up.is_completed then (l.duration * 60)
          else coalesce(up.last_time, 0)
        end
      ) as watched_seconds
    from user_progress up
    join lessons l on up.lesson_id = l.id and l.status = 'published'
    where up.user_id = auth.uid()
    group by up.course_id
  )
  select
    c.id,
    c.title,
    c.slug,
    c."thumbnailUrl",
    coalesce(ct.total_seconds, 0) as "totalDuration",
    e."createdAt" as "enrolledAt",
    case
      when ct.total_seconds > 0 then
        least(100, round((coalesce(us.watched_seconds, 0) / ct.total_seconds) * 100))::integer
      else 0
    end as progress
  from courses c
  join my_enrollments e on c.id = e."courseId"
  left join course_totals ct on c.id = ct.course_id
  left join user_stats us on c.id = us.course_id;
end;
$function$;

-- 5c. Duração do curso: havia TRÊS gatilhos em lessons fazendo a mesma conta
--     (tr_lessons_duration_change, trg_update_course_duration e
--     trigger_update_course_duration), ou seja, 3 UPDATEs em courses a cada
--     mudança de aula. Fica um só, somando apenas aulas publicadas e
--     atualizando "updatedAt" (o que só um dos três fazia).
create or replace function public.fn_sync_course_duration()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') then
    update public.courses
    set total_duration = (
          select coalesce(sum(duration), 0)
          from public.lessons
          where course_id = new.course_id and status = 'published'
        ),
        "updatedAt" = timezone('utc'::text, now())
    where id = new.course_id;
  end if;

  if (tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.course_id <> new.course_id)) then
    update public.courses
    set total_duration = (
          select coalesce(sum(duration), 0)
          from public.lessons
          where course_id = old.course_id and status = 'published'
        ),
        "updatedAt" = timezone('utc'::text, now())
    where id = old.course_id;
  end if;

  return null;
end;
$function$;

drop trigger if exists trg_update_course_duration on public.lessons;
drop trigger if exists trigger_update_course_duration on public.lessons;
-- As funções update_course_duration() e update_course_total_duration() ficam
-- no banco sem uso; dá para apagar depois de confirmar que nada mais as chama.

-- Recalcula a duração de todos os cursos uma vez com a regra nova
update public.courses c
set total_duration = coalesce((
  select sum(l.duration) from public.lessons l
  where l.course_id = c.id and l.status = 'published'
), 0);

-- -----------------------------------------------------------------------------
-- 6. SEGURANÇA: insígnias só pelo banco
--    Havia 7 políticas de INSERT em user_badges; duas com "with check (true)"
--    deixavam qualquer usuário logado inserir QUALQUER insígnia para QUALQUER
--    pessoa, e o gatilho on_badge_earned convertia isso em XP e ranking.
--    A insígnia é concedida por check_course_completion (SECURITY DEFINER,
--    não depende da RLS), então ninguém precisa inserir pelo navegador.
--    Leitura continua como estava na prática (a política "true" já liberava
--    tudo); fica uma só para não confundir.
-- -----------------------------------------------------------------------------
drop policy if exists "Alunos podem ganhar insignias" on public.user_badges;
drop policy if exists "Ganhar insignia propria" on public.user_badges;
drop policy if exists "Permitir inserção de conquistas" on public.user_badges;
drop policy if exists "Usuários podem ganhar suas insígnias" on public.user_badges;
drop policy if exists "Usuários podem inserir suas insígnias" on public.user_badges;
drop policy if exists "permitir_medalhas_proprias" on public.user_badges;
drop policy if exists "Alunos podem ver suas insignias" on public.user_badges;
drop policy if exists "Permitir leitura de conquistas" on public.user_badges;
drop policy if exists "Usuários podem ver suas insígnias" on public.user_badges;
drop policy if exists "Usuários podem ver suas próprias conquistas" on public.user_badges;
drop policy if exists "Usuários podem ver suas próprias insígnias" on public.user_badges;
drop policy if exists "Ver insignias proprias" on public.user_badges;

alter table public.user_badges enable row level security;

drop policy if exists user_badges_read on public.user_badges;
create policy user_badges_read on public.user_badges
  for select to authenticated using (true);

-- Equipe pode corrigir insígnias manualmente (ex.: conceder ou remover)
drop policy if exists user_badges_staff_write on public.user_badges;
create policy user_badges_staff_write on public.user_badges
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Sem duplicatas hoje (conferido em 18/10/2026), então o índice cria limpo
create unique index if not exists user_badges_user_badge_key
  on public.user_badges (user_id, badge_id);

-- Mesmo corpo de antes; só fixa o search_path (boa prática em SECURITY DEFINER)
create or replace function public.award_course_xp()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_course_id integer;
  v_xp_weight integer;
  v_xp_to_award integer;
begin
  select course_id into v_course_id from public.badges where id = new.badge_id;

  if exists (select 1 from public.xp_history where user_id = new.user_id and course_id = v_course_id) then
    return new;
  end if;

  select coalesce(xp_weight, 1) into v_xp_weight from public.courses where id = v_course_id;

  v_xp_to_award := case v_xp_weight
    when 2 then 1200
    when 3 then 2500
    else 500
  end;

  insert into public.xp_history (user_id, course_id, xp_earned)
  values (new.user_id, v_course_id, v_xp_to_award);

  update public.profiles
  set total_xp = coalesce(total_xp, 0) + v_xp_to_award
  where id = new.user_id;

  return new;
end;
$function$;

-- -----------------------------------------------------------------------------
-- 7. Indexação para a busca com IA só quando a aula for publicada
--    Antes: disparava em todo INSERT. Agora: ao inserir já publicada ou ao
--    mudar de rascunho para publicada. O corpo da chamada não muda.
-- -----------------------------------------------------------------------------
create or replace function public.gatilho_nova_aula()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  v_should_index boolean := false;
begin
  -- Em INSERT não há OLD; por isso a checagem fica separada por operação
  if tg_op = 'INSERT' then
    v_should_index := new.status = 'published';
  elsif tg_op = 'UPDATE' then
    v_should_index := new.status = 'published' and old.status is distinct from 'published';
  end if;

  if v_should_index then
    perform net.http_post(
      url := 'https://zvgchncgvadzpkffhfbr.supabase.co/functions/v1/buscar-com-ia',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('query', (new.title || '. ' || coalesce(new.content, '')))
    );
  end if;
  return new;
end;
$function$;

drop trigger if exists ao_inserir_aula on public.lessons;
create trigger ao_inserir_aula
  after insert or update of status on public.lessons
  for each row execute function public.gatilho_nova_aula();

commit;

-- =============================================================================
-- DEPOIS DE RODAR
--   * Publicar a versão do front que não insere mais insígnia pelo navegador
--     (Player.tsx). A versão antiga continua funcionando: a gravação dela
--     passa a ser recusada em silêncio e o banco concede a insígnia sozinho.
--   * Risco conhecido que esta migração NÃO resolve: o progresso
--     (user_progress) é gravado pelo navegador, então um aluno técnico pode
--     marcar aulas como concluídas sem assistir. Resolver exige validar no
--     servidor (ex.: Edge Function que confere o tempo assistido).
-- =============================================================================

-- =============================================================================
-- DESFAZER (só se precisar voltar atrás; apaga módulos e anexos)
-- =============================================================================
-- begin;
-- drop policy if exists lesson_materials_write on storage.objects;
-- drop policy if exists lesson_materials_read on storage.objects;
-- drop table if exists public.lesson_attachments;
-- drop policy if exists lessons_hide_drafts on public.lessons;
-- alter table public.lessons drop constraint if exists lessons_status_check;
-- alter table public.lessons drop column if exists published_at;
-- alter table public.lessons drop column if exists status;
-- drop trigger if exists lessons_module_same_course on public.lessons;
-- drop function if exists public.lessons_module_same_course();
-- alter table public.lessons drop column if exists module_id;
-- drop table if exists public.course_modules;
-- drop function if exists public.is_staff();
-- commit;
-- (o bucket lesson-materials precisa ser esvaziado e removido pelo painel)
