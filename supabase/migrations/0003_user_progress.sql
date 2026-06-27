-- ============================================================================
-- PastQ — Student progress tracking + dashboard stats
--
-- Run after 0002_search.sql in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/hukwgvbqtxvakncdjwwy/sql/new
-- ============================================================================

-- ----------------------------------------------------------------------------
-- user_progress: one row per question attempt
-- ----------------------------------------------------------------------------
create table if not exists public.user_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  question_id  uuid not null references public.questions (id) on delete cascade,
  is_correct   boolean,
  attempted_at timestamptz not null default now()
);

create index if not exists idx_user_progress_user        on public.user_progress (user_id);
create index if not exists idx_user_progress_user_time    on public.user_progress (user_id, attempted_at desc);
create index if not exists idx_user_progress_question     on public.user_progress (question_id);

-- ----------------------------------------------------------------------------
-- RLS: a student may only see and write their OWN progress rows.
-- ----------------------------------------------------------------------------
alter table public.user_progress enable row level security;

drop policy if exists "user_progress_select_own" on public.user_progress;
create policy "user_progress_select_own" on public.user_progress
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "user_progress_insert_own" on public.user_progress;
create policy "user_progress_insert_own" on public.user_progress
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "user_progress_delete_own" on public.user_progress;
create policy "user_progress_delete_own" on public.user_progress
  for delete to authenticated using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- get_dashboard_stats(): aggregate stats for the signed-in student as JSON.
-- security invoker → auth.uid() resolves to the caller and RLS still applies.
-- ----------------------------------------------------------------------------
create or replace function public.get_dashboard_stats()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  uid           uuid := auth.uid();
  v_attempted   integer := 0;
  v_graded      integer := 0;
  v_correct     integer := 0;
  v_subjects    integer := 0;
  v_streak      integer := 0;
  v_last_day    date;
  v_recent      jsonb;
  v_recommended jsonb;
begin
  if uid is null then
    return jsonb_build_object('authenticated', false);
  end if;

  select count(distinct question_id)
    into v_attempted
    from public.user_progress
   where user_id = uid;

  select count(*), count(*) filter (where is_correct)
    into v_graded, v_correct
    from public.user_progress
   where user_id = uid and is_correct is not null;

  select count(distinct p.subject_id)
    into v_subjects
    from public.user_progress up
    join public.questions q on q.id = up.question_id
    join public.papers p on p.id = q.paper_id
   where up.user_id = uid;

  -- Current streak: count of consecutive days ending at the latest active day.
  with days as (
    select distinct (attempted_at at time zone 'UTC')::date as d
      from public.user_progress
     where user_id = uid
  ),
  ranked as (
    select d, row_number() over (order by d desc) as rn from days
  )
  select coalesce(count(*), 0)
    into v_streak
    from ranked
   where d = ((select max(d) from days) - (rn - 1)::int);

  select max((attempted_at at time zone 'UTC')::date)
    into v_last_day
    from public.user_progress
   where user_id = uid;

  -- Streak only counts if the latest activity was today or yesterday.
  if v_last_day is null or v_last_day < (current_date - 1) then
    v_streak := 0;
  end if;

  -- Recent activity: last 5 papers practiced, with a per-paper score.
  select jsonb_agg(row_to_json(r))
    into v_recent
    from (
      select
        p.id                              as paper_id,
        p.title                           as paper_title,
        p.year                            as year,
        s.name                            as subject_name,
        count(*) filter (where up.is_correct is not null) as answered,
        count(*) filter (where up.is_correct)             as correct,
        max(up.attempted_at)              as last_attempt
      from public.user_progress up
      join public.questions q on q.id = up.question_id
      join public.papers    p on p.id = q.paper_id
      join public.subjects  s on s.id = p.subject_id
      where up.user_id = uid
      group by p.id, p.title, p.year, s.name
      order by max(up.attempted_at) desc
      limit 5
    ) r;

  -- Recommended next: a subject the student has not attempted yet.
  select to_jsonb(rec)
    into v_recommended
    from (
      select
        s.id        as subject_id,
        s.name      as subject_name,
        s.slug      as subject_slug,
        i.slug      as institution_slug,
        i.name      as institution_name,
        l.slug      as level_slug,
        l.name      as level_name
      from public.subjects s
      join public.courses      c on c.id = s.course_id
      join public.institutions i on i.id = c.institution_id
      join public.levels       l on l.id = i.level_id
      where s.id not in (
        select distinct p.subject_id
          from public.user_progress up
          join public.questions q on q.id = up.question_id
          join public.papers    p on p.id = q.paper_id
         where up.user_id = uid
      )
      order by (select count(*) from public.papers pp where pp.subject_id = s.id) desc, s.name
      limit 1
    ) rec;

  return jsonb_build_object(
    'authenticated',       true,
    'questions_attempted', v_attempted,
    'graded',              v_graded,
    'correct',             v_correct,
    'subjects_practiced',  v_subjects,
    'streak',              v_streak,
    'recent',              coalesce(v_recent, '[]'::jsonb),
    'recommended',         v_recommended
  );
end;
$$;

grant execute on function public.get_dashboard_stats() to authenticated;

-- ============================================================================
-- Done.
-- ============================================================================
