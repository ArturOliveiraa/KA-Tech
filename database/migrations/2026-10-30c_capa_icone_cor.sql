-- =============================================================================
-- KA Tech — Ícone e cor da capa automática (rodar depois de 2026-10-30b)
--  1. courses e categories ganham cover_icon e cover_color. Vazio (null) =
--     automático: o site escolhe pelo título do curso ou pelo nome da trilha.
--     Os valores são as chaves usadas no site (ex.: 'cart', 'violet').
--  2. get_user_dashboard devolve também essas escolhas e a trilha do curso,
--     para a capa do dashboard ficar igual à da trilha e do admin.
--     A forma do retorno muda, então a função é recriada (drop + create).
-- =============================================================================

begin;

alter table public.courses
  add column if not exists cover_icon text,
  add column if not exists cover_color text;

alter table public.categories
  add column if not exists cover_icon text,
  add column if not exists cover_color text;

drop function if exists public.get_user_dashboard();

create function public.get_user_dashboard()
returns table(
  id integer,
  title text,
  slug text,
  "thumbnailUrl" text,
  "totalDuration" double precision,
  "enrolledAt" timestamp without time zone,
  progress integer,
  cover_icon text,
  cover_color text,
  category_name text,
  category_cover_icon text,
  category_cover_color text
)
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
    end as progress,
    c.cover_icon,
    c.cover_color,
    cat.name::text as category_name,
    cat.cover_icon as category_cover_icon,
    cat.cover_color as category_cover_color
  from courses c
  join my_enrollments e on c.id = e."courseId"
  left join categories cat on cat.id = c.category_id
  left join course_totals ct on c.id = ct.course_id
  left join user_stats us on c.id = us.course_id;
end;
$function$;

grant execute on function public.get_user_dashboard() to authenticated;

commit;
