-- ============================================================================
-- PastQ — CONSOLIDATED schema + Ghana seed (run once in the Supabase SQL editor)
-- This file equals migrations 0001..0005 concatenated. Idempotent: safe to re-run.
-- ============================================================================


-- >>>>>>>>>> 0001_init_pastq.sql >>>>>>>>>>

-- ============================================================================
-- PastQ â€” Ghana Exam Past Questions Platform
-- Initial schema migration
--
-- Hierarchy: levels â†’ institutions â†’ courses â†’ subjects â†’ papers â†’ questions
--
-- Run this in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/hukwgvbqtxvakncdjwwy/sql/new
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto; -- for gen_random_uuid()

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'question_type') then
    create type public.question_type as enum ('mcq', 'essay', 'structured');
  end if;
end$$;

-- ----------------------------------------------------------------------------
-- Helper: keep updated_at fresh
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- levels
-- ----------------------------------------------------------------------------
create table if not exists public.levels (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  slug        text        not null unique,
  description text,
  "order"     integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- institutions
-- ----------------------------------------------------------------------------
create table if not exists public.institutions (
  id           uuid primary key default gen_random_uuid(),
  level_id     uuid        not null references public.levels (id) on delete cascade,
  name         text        not null,
  slug         text        not null,
  abbreviation text,
  description  text,
  "order"      integer     not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (level_id, slug)
);

-- ----------------------------------------------------------------------------
-- courses
-- ----------------------------------------------------------------------------
create table if not exists public.courses (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid        not null references public.institutions (id) on delete cascade,
  name           text        not null,
  slug           text        not null,
  description    text,
  "order"        integer     not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (institution_id, slug)
);

-- ----------------------------------------------------------------------------
-- subjects
-- ----------------------------------------------------------------------------
create table if not exists public.subjects (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid        not null references public.courses (id) on delete cascade,
  name        text        not null,
  slug        text        not null,
  description text,
  "order"     integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (course_id, slug)
);

-- ----------------------------------------------------------------------------
-- papers
-- ----------------------------------------------------------------------------
create table if not exists public.papers (
  id               uuid primary key default gen_random_uuid(),
  subject_id       uuid        not null references public.subjects (id) on delete cascade,
  year             integer     not null,
  title            text        not null,
  description      text,
  total_questions  integer     not null default 0,
  duration_minutes integer,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (subject_id, year, title)
);

-- ----------------------------------------------------------------------------
-- questions
-- ----------------------------------------------------------------------------
create table if not exists public.questions (
  id          uuid primary key default gen_random_uuid(),
  paper_id    uuid        not null references public.papers (id) on delete cascade,
  number      integer     not null,
  type        public.question_type not null default 'mcq',
  content     text        not null,
  options     jsonb,
  answer      text,
  explanation text,
  marks       integer     not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Full-text search vector, generated from the question content.
  search_vector tsvector generated always as (to_tsvector('english', coalesce(content, ''))) stored,
  unique (paper_id, number)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Foreign-key / hierarchy lookups
create index if not exists idx_institutions_level_id on public.institutions (level_id);
create index if not exists idx_courses_institution_id on public.courses (institution_id);
create index if not exists idx_subjects_course_id     on public.subjects (course_id);
create index if not exists idx_papers_subject_id      on public.papers (subject_id);
create index if not exists idx_questions_paper_id     on public.questions (paper_id);

-- Common ordering / filtering
create index if not exists idx_levels_order        on public.levels ("order");
create index if not exists idx_institutions_order  on public.institutions (level_id, "order");
create index if not exists idx_courses_order       on public.courses (institution_id, "order");
create index if not exists idx_subjects_order      on public.subjects (course_id, "order");
create index if not exists idx_papers_year         on public.papers (subject_id, year desc);
create index if not exists idx_questions_type      on public.questions (type);

-- Full-text search (GIN over the generated tsvector)
create index if not exists idx_questions_search_vector
  on public.questions using gin (search_vector);

-- ============================================================================
-- updated_at TRIGGERS
-- ============================================================================
do $$
declare
  t text;
begin
  foreach t in array array['levels','institutions','courses','subjects','papers','questions']
  loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$s;', t);
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$s
         for each row execute function public.set_updated_at();', t);
  end loop;
end$$;

-- ============================================================================
-- ROW LEVEL SECURITY
--   Policy: anyone can read (public catalog), only authenticated users write.
-- ============================================================================
do $$
declare
  t text;
begin
  foreach t in array array['levels','institutions','courses','subjects','papers','questions']
  loop
    execute format('alter table public.%I enable row level security;', t);

    -- Public read
    execute format('drop policy if exists "%1$s_public_read" on public.%1$s;', t);
    execute format(
      'create policy "%1$s_public_read" on public.%1$s
         for select to anon, authenticated using (true);', t);

    -- Authenticated insert
    execute format('drop policy if exists "%1$s_auth_insert" on public.%1$s;', t);
    execute format(
      'create policy "%1$s_auth_insert" on public.%1$s
         for insert to authenticated with check (true);', t);

    -- Authenticated update
    execute format('drop policy if exists "%1$s_auth_update" on public.%1$s;', t);
    execute format(
      'create policy "%1$s_auth_update" on public.%1$s
         for update to authenticated using (true) with check (true);', t);

    -- Authenticated delete
    execute format('drop policy if exists "%1$s_auth_delete" on public.%1$s;', t);
    execute format(
      'create policy "%1$s_auth_delete" on public.%1$s
         for delete to authenticated using (true);', t);
  end loop;
end$$;

-- ============================================================================
-- SEED DATA  (idempotent â€” safe to re-run)
-- ============================================================================

-- ---- Levels ----------------------------------------------------------------
insert into public.levels (name, slug, description, "order") values
  ('BECE',         'bece',         'Basic Education Certificate Examination â€” taken at the end of Junior High School (JHS 3).', 1),
  ('WASSCE',       'wassce',       'West African Senior School Certificate Examination â€” taken at the end of Senior High School (SHS 3).', 2),
  ('University',   'university',   'Tertiary degree-level past questions from Ghanaian universities.', 3),
  ('Professional', 'professional', 'Professional certification and licensure examinations.', 4)
on conflict (slug) do nothing;

-- ---- Institutions ----------------------------------------------------------
-- BECE
insert into public.institutions (level_id, name, slug, abbreviation, description, "order")
select l.id, v.name, v.slug, v.abbreviation, v.description, v."order"
from public.levels l
join (values
  ('West African Examinations Council', 'waec',  'WAEC',  'The examining body that administers the BECE in Ghana.', 1),
  ('Ghana Education Service',           'ges',   'GES',    'Manages pre-tertiary public education and BECE candidates.', 2),
  ('National Council for Curriculum and Assessment', 'nacca', 'NaCCA', 'Sets the curriculum and assessment standards for basic education.', 3)
) as v(name, slug, abbreviation, description, "order") on true
where l.slug = 'bece'
on conflict (level_id, slug) do nothing;

-- WASSCE
insert into public.institutions (level_id, name, slug, abbreviation, description, "order")
select l.id, v.name, v.slug, v.abbreviation, v.description, v."order"
from public.levels l
join (values
  ('West African Examinations Council', 'waec',          'WAEC', 'Administers the WASSCE for school candidates.', 1),
  ('WASSCE Private Candidates',         'wassce-private', 'WASSCE-PC', 'WASSCE for private (November/December) candidates.', 2),
  ('Ghana Education Service',           'ges',           'GES',  'Oversees public Senior High Schools and WASSCE preparation.', 3)
) as v(name, slug, abbreviation, description, "order") on true
where l.slug = 'wassce'
on conflict (level_id, slug) do nothing;

-- University
insert into public.institutions (level_id, name, slug, abbreviation, description, "order")
select l.id, v.name, v.slug, v.abbreviation, v.description, v."order"
from public.levels l
join (values
  ('University of Ghana',                                       'university-of-ghana', 'UG',    'Ghana''s oldest and largest university, located in Legon, Accra.', 1),
  ('Kwame Nkrumah University of Science and Technology',        'knust',               'KNUST', 'Leading science and technology university in Kumasi.', 2),
  ('University of Cape Coast',                                  'ucc',                 'UCC',   'Renowned for education and arts programmes, located in Cape Coast.', 3)
) as v(name, slug, abbreviation, description, "order") on true
where l.slug = 'university'
on conflict (level_id, slug) do nothing;

-- Professional
insert into public.institutions (level_id, name, slug, abbreviation, description, "order")
select l.id, v.name, v.slug, v.abbreviation, v.description, v."order"
from public.levels l
join (values
  ('Institute of Chartered Accountants, Ghana', 'icag', 'ICAG', 'Professional accountancy body in Ghana.', 1),
  ('Ghana School of Law',                       'gsl',  'GSL',  'Provides professional legal education for the Ghana Bar.', 2),
  ('Chartered Institute of Marketing, Ghana',   'cimg', 'CIMG', 'Professional body for marketing practitioners in Ghana.', 3)
) as v(name, slug, abbreviation, description, "order") on true
where l.slug = 'professional'
on conflict (level_id, slug) do nothing;

-- ---- Courses ---------------------------------------------------------------
-- BECE â€º WAEC â€º Core subjects programme
insert into public.courses (institution_id, name, slug, description, "order")
select i.id, 'JHS Core Programme', 'jhs-core', 'Core subjects examined at the BECE level.', 1
from public.institutions i
join public.levels l on l.id = i.level_id
where l.slug = 'bece' and i.slug = 'waec'
on conflict (institution_id, slug) do nothing;

-- WASSCE â€º WAEC â€º General Science / General Arts / Business
insert into public.courses (institution_id, name, slug, description, "order")
select i.id, v.name, v.slug, v.description, v."order"
from public.institutions i
join public.levels l on l.id = i.level_id
join (values
  ('General Science', 'general-science', 'Science elective programme for SHS candidates.', 1),
  ('General Arts',    'general-arts',    'Arts elective programme for SHS candidates.', 2),
  ('Business',        'business',        'Business elective programme for SHS candidates.', 3)
) as v(name, slug, description, "order") on true
where l.slug = 'wassce' and i.slug = 'waec'
on conflict (institution_id, slug) do nothing;

-- University â€º UG â€º BSc Computer Science
insert into public.courses (institution_id, name, slug, description, "order")
select i.id, 'BSc Computer Science', 'bsc-computer-science', 'Undergraduate computer science degree programme.', 1
from public.institutions i
join public.levels l on l.id = i.level_id
where l.slug = 'university' and i.slug = 'university-of-ghana'
on conflict (institution_id, slug) do nothing;

-- Professional â€º ICAG â€º Level 1
insert into public.courses (institution_id, name, slug, description, "order")
select i.id, 'ICAG Level 1', 'icag-level-1', 'Foundation level of the ICAG professional qualification.', 1
from public.institutions i
join public.levels l on l.id = i.level_id
where l.slug = 'professional' and i.slug = 'icag'
on conflict (institution_id, slug) do nothing;

-- ---- Subjects --------------------------------------------------------------
-- BECE â€º JHS Core Programme
insert into public.subjects (course_id, name, slug, description, "order")
select c.id, v.name, v.slug, v.description, v."order"
from public.courses c
join (values
  ('Mathematics',         'mathematics',         'Core mathematics for JHS.', 1),
  ('Integrated Science',  'integrated-science',  'Integrated science for JHS.', 2),
  ('English Language',    'english-language',    'English language for JHS.', 3),
  ('Social Studies',      'social-studies',      'Social studies for JHS.', 4)
) as v(name, slug, description, "order") on true
where c.slug = 'jhs-core'
on conflict (course_id, slug) do nothing;

-- WASSCE â€º General Science
insert into public.subjects (course_id, name, slug, description, "order")
select c.id, v.name, v.slug, v.description, v."order"
from public.courses c
join (values
  ('Integrated Science', 'integrated-science', 'Core integrated science for SHS.', 1),
  ('Core Mathematics',   'core-mathematics',   'Core mathematics for SHS.', 2),
  ('Physics',            'physics',            'Elective physics.', 3),
  ('Chemistry',          'chemistry',          'Elective chemistry.', 4),
  ('Biology',            'biology',            'Elective biology.', 5)
) as v(name, slug, description, "order") on true
where c.slug = 'general-science'
on conflict (course_id, slug) do nothing;

-- University â€º BSc Computer Science
insert into public.subjects (course_id, name, slug, description, "order")
select c.id, v.name, v.slug, v.description, v."order"
from public.courses c
join (values
  ('Introduction to Programming', 'intro-to-programming', 'First-year programming fundamentals.', 1),
  ('Data Structures and Algorithms', 'data-structures-algorithms', 'Core data structures and algorithms.', 2)
) as v(name, slug, description, "order") on true
where c.slug = 'bsc-computer-science'
on conflict (course_id, slug) do nothing;

-- Professional â€º ICAG Level 1
insert into public.subjects (course_id, name, slug, description, "order")
select c.id, 'Financial Accounting', 'financial-accounting', 'Financial accounting paper for ICAG Level 1.', 1
from public.courses c
where c.slug = 'icag-level-1'
on conflict (course_id, slug) do nothing;

-- ---- Paper + Questions -----------------------------------------------------
-- Seed a 2023 WASSCE Integrated Science paper with 5 sample questions.
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id,
       2023,
       'WASSCE 2023 Integrated Science Paper 1 (Objectives)',
       'Sample objective test paper for WASSCE Integrated Science.',
       5,
       60
from public.subjects s
join public.courses c on c.id = s.course_id
where c.slug = 'general-science' and s.slug = 'integrated-science'
on conflict (subject_id, year, title) do nothing;

-- Questions
with paper as (
  select p.id
  from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses  c on c.id = s.course_id
  where c.slug = 'general-science'
    and s.slug = 'integrated-science'
    and p.year = 2023
    and p.title = 'WASSCE 2023 Integrated Science Paper 1 (Objectives)'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper
join (values
  (1, 'mcq',
   'Which of the following is the basic unit of life?',
   '{"A":"Tissue","B":"Cell","C":"Organ","D":"Organism"}'::jsonb,
   'B',
   'The cell is the smallest structural and functional unit of all living organisms.',
   1),
  (2, 'mcq',
   'The process by which green plants manufacture their own food is called',
   '{"A":"respiration","B":"transpiration","C":"photosynthesis","D":"digestion"}'::jsonb,
   'C',
   'Photosynthesis uses sunlight, water and carbon dioxide to produce glucose and oxygen in chlorophyll-containing cells.',
   1),
  (3, 'mcq',
   'Which gas is most abundant in the Earth''s atmosphere?',
   '{"A":"Oxygen","B":"Carbon dioxide","C":"Hydrogen","D":"Nitrogen"}'::jsonb,
   'D',
   'Nitrogen makes up about 78% of the Earth''s atmosphere by volume.',
   1),
  (4, 'mcq',
   'The SI unit of electric current is the',
   '{"A":"volt","B":"ampere","C":"ohm","D":"watt"}'::jsonb,
   'B',
   'Electric current is measured in amperes (A); the volt measures potential difference and the ohm measures resistance.',
   1),
  (5, 'mcq',
   'A balanced diet must contain carbohydrates, proteins, fats, vitamins, minerals and',
   '{"A":"water","B":"starch","C":"sugar","D":"oil"}'::jsonb,
   'A',
   'Water is an essential component of a balanced diet, required for transport, temperature regulation and metabolic reactions.',
   1)
) as q(number, type, content, options, answer, explanation, marks) on true
on conflict (paper_id, number) do nothing;

-- ============================================================================
-- Done.
-- ============================================================================



-- >>>>>>>>>> 0002_search.sql >>>>>>>>>>

-- ============================================================================
-- PastQ â€” Full-text search support
--
-- Run after 0001_init_pastq.sql in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/hukwgvbqtxvakncdjwwy/sql/new
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Idempotent rename for databases created before the column was named
-- `search_vector` (older 0001 used `content_search`).
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'questions'
      and column_name = 'content_search'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'questions'
      and column_name = 'search_vector'
  ) then
    alter table public.questions rename column content_search to search_vector;
  end if;
end$$;

alter index if exists public.idx_questions_content_search
  rename to idx_questions_search_vector;

-- ----------------------------------------------------------------------------
-- search_questions(): full-text search over questions, joined up the hierarchy,
-- with optional filters and pagination. SECURITY INVOKER so RLS still applies.
-- `total_count` is the pre-pagination match count (window function).
-- ----------------------------------------------------------------------------
create or replace function public.search_questions(
  search_query          text,
  filter_level_id       uuid    default null,
  filter_institution_id uuid    default null,
  filter_subject_id     uuid    default null,
  filter_year           integer default null,
  result_limit          integer default 20,
  result_offset         integer default 0
)
returns table (
  id               uuid,
  paper_id         uuid,
  number           integer,
  type             public.question_type,
  content          text,
  options          jsonb,
  answer           text,
  explanation      text,
  marks            integer,
  paper_title      text,
  year             integer,
  subject_id       uuid,
  subject_name     text,
  institution_id   uuid,
  institution_name text,
  level_id         uuid,
  total_count      bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    q.id,
    q.paper_id,
    q.number,
    q.type,
    q.content,
    q.options,
    q.answer,
    q.explanation,
    q.marks,
    p.title  as paper_title,
    p.year,
    s.id     as subject_id,
    s.name   as subject_name,
    i.id     as institution_id,
    i.name   as institution_name,
    i.level_id,
    count(*) over() as total_count
  from public.questions q
  join public.papers       p on q.paper_id = p.id
  join public.subjects     s on p.subject_id = s.id
  join public.courses      c on s.course_id = c.id
  join public.institutions i on c.institution_id = i.id
  where
    (
      coalesce(btrim(search_query), '') = ''
      or q.search_vector @@ plainto_tsquery('english', search_query)
    )
    and (filter_level_id       is null or i.level_id = filter_level_id)
    and (filter_institution_id is null or i.id       = filter_institution_id)
    and (filter_subject_id     is null or s.id       = filter_subject_id)
    and (filter_year           is null or p.year     = filter_year)
  order by
    ts_rank(q.search_vector, plainto_tsquery('english', coalesce(search_query, ''))) desc,
    p.year desc,
    q.number asc
  limit  greatest(1, least(result_limit, 100))
  offset greatest(0, result_offset);
$$;

grant execute on function public.search_questions(
  text, uuid, uuid, uuid, integer, integer, integer
) to anon, authenticated;

-- ============================================================================
-- Done.
-- ============================================================================



-- >>>>>>>>>> 0003_user_progress.sql >>>>>>>>>>

-- ============================================================================
-- PastQ â€” Student progress tracking + dashboard stats
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
-- security invoker â†’ auth.uid() resolves to the caller and RLS still applies.
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



-- >>>>>>>>>> 0004_demo_seed.sql >>>>>>>>>>

-- ============================================================================
-- PastQ â€” Rich demo seed data (WASSCE Maths, BECE Science, WASSCE English)
--
-- Idempotent: safe to re-run. Run after 0001â€“0003 in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/hukwgvbqtxvakncdjwwy/sql/new
--
-- NOTE: These questions are representative of the WAEC BECE/WASSCE style and
-- syllabus. Verify wording against official WAEC past papers before any
-- non-demo use.
-- ============================================================================

-- Ensure a WASSCE English Language subject exists (under the General Arts course).
insert into public.subjects (course_id, name, slug, description, "order")
select c.id, 'English Language', 'english-language',
       'WASSCE English Language â€” comprehension, lexis, structure and essay.', 1
from public.courses c
join public.institutions i on i.id = c.institution_id
join public.levels l on l.id = i.level_id
where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-arts'
on conflict (course_id, slug) do nothing;

-- ============================================================================
-- WASSCE â€” Core Mathematics (20 questions across 2019â€“2023)
-- ============================================================================

-- ---- 2023 Core Mathematics Paper 1 (Objectives): 8 MCQ ---------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2023, 'WASSCE 2023 Core Mathematics Paper 1 (Objectives)',
       'Objective test covering indices, fractions, algebra, geometry and statistics.', 8, 90
from public.subjects s
join public.courses c on c.id = s.course_id
join public.institutions i on i.id = c.institution_id
join public.levels l on l.id = i.level_id
where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-science' and s.slug = 'core-mathematics'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  join public.institutions i on i.id = c.institution_id
  join public.levels l on l.id = i.level_id
  where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-science'
    and s.slug = 'core-mathematics' and p.year = 2023
    and p.title = 'WASSCE 2023 Core Mathematics Paper 1 (Objectives)'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','If 2^x = 32, find the value of x.','{"A":"3","B":"4","C":"5","D":"6"}'::jsonb,'C','32 = 2^5, so x = 5.',1),
  (2,'mcq','Simplify 3/4 + 1/2.','{"A":"5/4","B":"1","C":"4/6","D":"5/6"}'::jsonb,'A','3/4 + 2/4 = 5/4.',1),
  (3,'mcq','Solve for x: 3x - 7 = 11.','{"A":"4","B":"5","C":"6","D":"18"}'::jsonb,'C','3x = 18, so x = 6.',1),
  (4,'mcq','Find the area of a circle of radius 7 cm. (Take pi = 22/7)','{"A":"22 cm^2","B":"44 cm^2","C":"154 cm^2","D":"308 cm^2"}'::jsonb,'C','Area = pi r^2 = 22/7 x 7 x 7 = 154 cm^2.',1),
  (5,'mcq','Express 0.0045 in standard form.','{"A":"4.5 x 10^-3","B":"45 x 10^-4","C":"4.5 x 10^3","D":"0.45 x 10^-2"}'::jsonb,'A','Move the decimal point 3 places right: 4.5 x 10^-3.',1),
  (6,'mcq','Find the gradient of the line joining (1, 2) and (3, 6).','{"A":"1","B":"2","C":"3","D":"4"}'::jsonb,'B','Gradient = (6 - 2)/(3 - 1) = 4/2 = 2.',1),
  (7,'mcq','Evaluate log10 1000.','{"A":"1","B":"2","C":"3","D":"10"}'::jsonb,'C','1000 = 10^3, so log10 1000 = 3.',1),
  (8,'mcq','Find the next term of the sequence 2, 5, 10, 17, ...','{"A":"24","B":"25","C":"26","D":"27"}'::jsonb,'C','Differences are 3, 5, 7, 9; 17 + 9 = 26.',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- 2022 Core Mathematics Paper 1 (Objectives): 4 MCQ ---------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2022, 'WASSCE 2022 Core Mathematics Paper 1 (Objectives)',
       'Objective test covering equations, probability, factorisation and trigonometry.', 4, 90
from public.subjects s
join public.courses c on c.id = s.course_id
join public.institutions i on i.id = c.institution_id
join public.levels l on l.id = i.level_id
where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-science' and s.slug = 'core-mathematics'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  join public.institutions i on i.id = c.institution_id
  join public.levels l on l.id = i.level_id
  where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-science'
    and s.slug = 'core-mathematics' and p.year = 2022
    and p.title = 'WASSCE 2022 Core Mathematics Paper 1 (Objectives)'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','Solve for x: x/3 = 4.','{"A":"1.33","B":"4","C":"7","D":"12"}'::jsonb,'D','Multiply both sides by 3: x = 12.',1),
  (2,'mcq','A bag contains 3 red and 2 blue balls. What is the probability of picking a red ball?','{"A":"2/5","B":"1/2","C":"3/5","D":"3/2"}'::jsonb,'C','P(red) = 3/(3+2) = 3/5.',1),
  (3,'mcq','Factorise x^2 - 9.','{"A":"(x - 3)(x + 3)","B":"(x - 9)(x + 1)","C":"(x - 3)^2","D":"(x + 3)^2"}'::jsonb,'A','Difference of two squares: x^2 - 9 = (x - 3)(x + 3).',1),
  (4,'mcq','Find the mean of 4, 8, 10, 12 and 16.','{"A":"8","B":"10","C":"12","D":"50"}'::jsonb,'B','Sum = 50; mean = 50/5 = 10.',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- 2020 Core Mathematics Paper 2 (Essay): 4 essay ------------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2020, 'WASSCE 2020 Core Mathematics Paper 2 (Essay)',
       'Theory questions on simultaneous equations, percentages, ratio and rates.', 4, 150
from public.subjects s
join public.courses c on c.id = s.course_id
join public.institutions i on i.id = c.institution_id
join public.levels l on l.id = i.level_id
where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-science' and s.slug = 'core-mathematics'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  join public.institutions i on i.id = c.institution_id
  join public.levels l on l.id = i.level_id
  where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-science'
    and s.slug = 'core-mathematics' and p.year = 2020
    and p.title = 'WASSCE 2020 Core Mathematics Paper 2 (Essay)'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'essay','Solve the simultaneous equations: 2x + y = 7 and x - y = 2.',null::jsonb,'x = 3, y = 1','Adding the two equations: 3x = 9, so x = 3. Substitute into x - y = 2: 3 - y = 2, so y = 1.',5),
  (2,'essay','A trader bought a television set for GHâ‚µ800 and sold it for GHâ‚µ950. Calculate the percentage profit.',null::jsonb,'18.75%','Profit = 950 - 800 = GHâ‚µ150. Percentage profit = (150/800) x 100% = 18.75%.',5),
  (3,'essay','The angles of a triangle are in the ratio 2 : 3 : 4. Find the size of the largest angle.',null::jsonb,'80 degrees','Total parts = 2 + 3 + 4 = 9. Angles sum to 180 degrees, so the largest = (4/9) x 180 = 80 degrees.',4),
  (4,'essay','A car travels 120 km in 2 hours. Calculate its average speed in metres per second.',null::jsonb,'Approximately 16.7 m/s','Speed = 120 km / 2 h = 60 km/h = (60 x 1000)/3600 m/s = 16.67 m/s (3 s.f.).',4)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- 2019 Core Mathematics Paper 1 (Objectives): 4 MCQ ---------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2019, 'WASSCE 2019 Core Mathematics Paper 1 (Objectives)',
       'Objective test covering approximation, mensuration, percentages and trigonometry.', 4, 90
from public.subjects s
join public.courses c on c.id = s.course_id
join public.institutions i on i.id = c.institution_id
join public.levels l on l.id = i.level_id
where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-science' and s.slug = 'core-mathematics'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  join public.institutions i on i.id = c.institution_id
  join public.levels l on l.id = i.level_id
  where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-science'
    and s.slug = 'core-mathematics' and p.year = 2019
    and p.title = 'WASSCE 2019 Core Mathematics Paper 1 (Objectives)'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','Round 3.146 to two decimal places.','{"A":"3.1","B":"3.14","C":"3.15","D":"3.2"}'::jsonb,'C','The third decimal digit is 6, so round up: 3.15.',1),
  (2,'mcq','Find the perimeter of a square of side 5 cm.','{"A":"10 cm","B":"15 cm","C":"20 cm","D":"25 cm"}'::jsonb,'C','Perimeter = 4 x side = 4 x 5 = 20 cm.',1),
  (3,'mcq','Evaluate 15% of 200.','{"A":"15","B":"20","C":"30","D":"45"}'::jsonb,'C','15/100 x 200 = 30.',1),
  (4,'mcq','If sin Î¸ = 0.5, find Î¸ (for 0 <= Î¸ <= 90 degrees).','{"A":"30 degrees","B":"45 degrees","C":"60 degrees","D":"90 degrees"}'::jsonb,'A','sin 30 degrees = 0.5, so Î¸ = 30 degrees.',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ============================================================================
-- BECE â€” Integrated Science (15 questions across 2019â€“2023)
-- ============================================================================

-- ---- 2023 Integrated Science Paper 1 (Objectives): 8 MCQ -------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2023, 'BECE 2023 Integrated Science Paper 1 (Objectives)',
       'Objective test covering plants, matter, energy, health and the environment.', 8, 60
from public.subjects s
join public.courses c on c.id = s.course_id
join public.institutions i on i.id = c.institution_id
join public.levels l on l.id = i.level_id
where l.slug = 'bece' and i.slug = 'waec' and c.slug = 'jhs-core' and s.slug = 'integrated-science'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  join public.institutions i on i.id = c.institution_id
  join public.levels l on l.id = i.level_id
  where l.slug = 'bece' and i.slug = 'waec' and c.slug = 'jhs-core'
    and s.slug = 'integrated-science' and p.year = 2023
    and p.title = 'BECE 2023 Integrated Science Paper 1 (Objectives)'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','Which part of a plant manufactures food?','{"A":"Root","B":"Stem","C":"Leaf","D":"Flower"}'::jsonb,'C','Leaves contain chlorophyll and carry out photosynthesis to make food.',1),
  (2,'mcq','Which gas is needed for burning to take place?','{"A":"Nitrogen","B":"Oxygen","C":"Carbon dioxide","D":"Hydrogen"}'::jsonb,'B','Oxygen supports combustion (burning).',1),
  (3,'mcq','Which of the following is a good conductor of electricity?','{"A":"Rubber","B":"Wood","C":"Copper","D":"Plastic"}'::jsonb,'C','Copper is a metal and conducts electricity well.',1),
  (4,'mcq','The basic unit of all living things is the','{"A":"atom","B":"cell","C":"tissue","D":"organ"}'::jsonb,'B','The cell is the smallest structural and functional unit of life.',1),
  (5,'mcq','Which of these diseases is caused by a virus?','{"A":"Malaria","B":"Cholera","C":"Measles","D":"Typhoid"}'::jsonb,'C','Measles is caused by a virus; malaria is caused by a protozoan and the others by bacteria.',1),
  (6,'mcq','The change of water into water vapour is called','{"A":"condensation","B":"evaporation","C":"melting","D":"freezing"}'::jsonb,'B','Evaporation is the change from liquid to gas (vapour).',1),
  (7,'mcq','Which planet is closest to the Sun?','{"A":"Earth","B":"Venus","C":"Mercury","D":"Mars"}'::jsonb,'C','Mercury is the innermost planet of the Solar System.',1),
  (8,'mcq','Which class of food is the body''s main source of energy?','{"A":"Proteins","B":"Carbohydrates","C":"Vitamins","D":"Water"}'::jsonb,'B','Carbohydrates are the body''s primary source of energy.',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- 2021 Integrated Science Paper 2 (Essay): 4 essay ----------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2021, 'BECE 2021 Integrated Science Paper 2 (Essay)',
       'Short-answer theory questions on living things, agriculture, health and energy.', 4, 60
from public.subjects s
join public.courses c on c.id = s.course_id
join public.institutions i on i.id = c.institution_id
join public.levels l on l.id = i.level_id
where l.slug = 'bece' and i.slug = 'waec' and c.slug = 'jhs-core' and s.slug = 'integrated-science'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  join public.institutions i on i.id = c.institution_id
  join public.levels l on l.id = i.level_id
  where l.slug = 'bece' and i.slug = 'waec' and c.slug = 'jhs-core'
    and s.slug = 'integrated-science' and p.year = 2021
    and p.title = 'BECE 2021 Integrated Science Paper 2 (Essay)'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'essay','State three differences between living and non-living things.',null::jsonb,'Living things feed, respire, grow, reproduce, respond to stimuli, excrete and move; non-living things do not carry out these life processes.','Award one mark for each correct difference (e.g. living things respire/grow/reproduce while non-living things do not).',3),
  (2,'essay','Explain why a farmer applies fertilizer to crops.',null::jsonb,'Fertilizer adds nutrients (such as nitrogen, phosphorus and potassium) to the soil, replacing those used up by plants, so that crops grow healthily and give higher yields.','Key points: replaces lost soil nutrients, promotes healthy growth, increases yield.',3),
  (3,'essay','Describe how water can be made safe for drinking in the home.',null::jsonb,'Filter the water to remove solid particles, then boil it for several minutes to kill germs, or add a suitable disinfectant such as chlorine/water-treatment tablets, and store it in a clean covered container.','Accept: filtration, boiling, chlorination/treatment tablets, safe storage.',3),
  (4,'essay','State three uses of electricity in the home.',null::jsonb,'Lighting; cooking (electric stove/kettle); preserving food (refrigerator); ironing clothes; powering fans, televisions and radios.','Award one mark per valid household use, up to three.',3)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- 2019 Integrated Science Paper 1 (Objectives): 3 MCQ -------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2019, 'BECE 2019 Integrated Science Paper 1 (Objectives)',
       'Objective test covering reproduction in plants, energy and magnetism.', 3, 60
from public.subjects s
join public.courses c on c.id = s.course_id
join public.institutions i on i.id = c.institution_id
join public.levels l on l.id = i.level_id
where l.slug = 'bece' and i.slug = 'waec' and c.slug = 'jhs-core' and s.slug = 'integrated-science'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  join public.institutions i on i.id = c.institution_id
  join public.levels l on l.id = i.level_id
  where l.slug = 'bece' and i.slug = 'waec' and c.slug = 'jhs-core'
    and s.slug = 'integrated-science' and p.year = 2019
    and p.title = 'BECE 2019 Integrated Science Paper 1 (Objectives)'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','The female reproductive part of a flower is the','{"A":"stamen","B":"pistil","C":"petal","D":"sepal"}'::jsonb,'B','The pistil (carpel) is the female part; the stamen is the male part.',1),
  (2,'mcq','Which of the following is a renewable source of energy?','{"A":"Coal","B":"Petrol","C":"Solar","D":"Natural gas"}'::jsonb,'C','Solar energy is renewable; the others are finite fossil fuels.',1),
  (3,'mcq','Iron filings are attracted by a','{"A":"battery","B":"magnet","C":"bulb","D":"wire"}'::jsonb,'B','A magnet attracts magnetic materials such as iron.',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ============================================================================
-- WASSCE â€” English Language (10 questions across 2022â€“2023)
-- ============================================================================

-- ---- 2023 English Language Paper 1 (Objectives): 6 MCQ ---------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2023, 'WASSCE 2023 English Language Paper 1 (Objectives)',
       'Objective test on lexis, structure, synonyms, antonyms and grammar.', 6, 60
from public.subjects s
join public.courses c on c.id = s.course_id
join public.institutions i on i.id = c.institution_id
join public.levels l on l.id = i.level_id
where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-arts' and s.slug = 'english-language'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  join public.institutions i on i.id = c.institution_id
  join public.levels l on l.id = i.level_id
  where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-arts'
    and s.slug = 'english-language' and p.year = 2023
    and p.title = 'WASSCE 2023 English Language Paper 1 (Objectives)'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','Choose the word nearest in meaning to the underlined word: The harvest was abundant this year.','{"A":"scarce","B":"plentiful","C":"empty","D":"tiny"}'::jsonb,'B','"Abundant" means existing in large quantities, i.e. plentiful.',1),
  (2,'mcq','Choose the correctly spelt word.','{"A":"Recieve","B":"Receive","C":"Receeve","D":"Receve"}'::jsonb,'B','The rule "i before e except after c" gives "receive".',1),
  (3,'mcq','Choose the option that best completes the sentence: She has lived here ____ 2015.','{"A":"since","B":"for","C":"from","D":"at"}'::jsonb,'A','"Since" is used with a point in time (2015); "for" is used with a duration.',1),
  (4,'mcq','Choose the word opposite in meaning to the underlined word: The balloon began to expand.','{"A":"stretch","B":"grow","C":"contract","D":"widen"}'::jsonb,'C','The antonym of "expand" (get bigger) is "contract" (get smaller).',1),
  (5,'mcq','Identify the part of speech of the underlined word: He ran quickly to school.','{"A":"Adjective","B":"Adverb","C":"Noun","D":"Verb"}'::jsonb,'B','"Quickly" describes how he ran, so it is an adverb.',1),
  (6,'mcq','Choose the correct question tag: You are coming with us, ____?','{"A":"isn''t it","B":"aren''t you","C":"are you","D":"don''t you"}'::jsonb,'B','A positive statement with "you are" takes the negative tag "aren''t you".',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- 2022 English Language Paper 2 (Essay): 4 essay ------------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2022, 'WASSCE 2022 English Language Paper 2 (Essay & Comprehension)',
       'Guided composition, essay writing and summary.', 4, 120
from public.subjects s
join public.courses c on c.id = s.course_id
join public.institutions i on i.id = c.institution_id
join public.levels l on l.id = i.level_id
where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-arts' and s.slug = 'english-language'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  join public.institutions i on i.id = c.institution_id
  join public.levels l on l.id = i.level_id
  where l.slug = 'wassce' and i.slug = 'waec' and c.slug = 'general-arts'
    and s.slug = 'english-language' and p.year = 2022
    and p.title = 'WASSCE 2022 English Language Paper 2 (Essay & Comprehension)'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'essay','Write a letter to your friend in another town describing how you spent your last vacation.',null::jsonb,'An informal letter with the writer''s address and date, a greeting (Dear ...), an introduction, two or three paragraphs describing vacation activities, a conclusion, and an informal closing (e.g. "Your friend, ...").','Marks are awarded for content (relevant vacation details), organisation (correct informal-letter format), expression (grammar and vocabulary) and mechanical accuracy.',20),
  (2,'essay','Write an essay on the topic: The importance of reading. Give at least three points.',null::jsonb,'A well-structured essay with an introduction, three developed points (e.g. reading builds vocabulary, broadens knowledge, improves examination performance) and a conclusion.','Reward a clear thesis, three developed and relevant points with examples, logical paragraphing and accurate language.',20),
  (3,'essay','Read the following idea and summarise the main point in ONE sentence: "Many forests are being cut down for timber and farmland, which destroys animal habitats and contributes to climate change."',null::jsonb,'Deforestation for timber and farmland destroys animal habitats and worsens climate change.','Award full marks for one grammatical sentence that captures both causes (timber/farmland) and effects (habitat loss and climate change).',5),
  (4,'essay','Write an article for publication in your school magazine on the dangers of social media to students.',null::jsonb,'An article with a suitable title, a writer''s by-line, an introduction stating the issue, body paragraphs on dangers (e.g. distraction from studies, cyberbullying, exposure to harmful content, addiction) and a concluding recommendation.','Marks for appropriate article format and title, relevant well-developed points, coherence and correct expression.',20)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ============================================================================
-- Done.
-- ============================================================================



-- >>>>>>>>>> 0005_ghana_expansion.sql >>>>>>>>>>

-- ============================================================================
-- PastQ â€” Ghana expansion seed
--
-- Adds more authentic Ghanaian institutions and fills the University and
-- Professional levels with real, browsable past papers and questions:
--   University:    UG, KNUST, UCC, UEW, GIMPA, Ashesi, UPSA
--   Professional:  ICAG, CIMG, Ghana School of Law, CIB Ghana
--
-- Idempotent: safe to re-run. Run after 0001-0004 in the Supabase SQL editor.
--
-- NOTE: Questions are representative of each programme's syllabus and intended
-- for demo/revision. Verify wording against official papers before formal use.
-- ============================================================================

-- ============================================================================
-- UNIVERSITY â€” new institutions
-- ============================================================================
insert into public.institutions (level_id, name, slug, abbreviation, description, "order")
select l.id, v.name, v.slug, v.abbreviation, v.description, v."order"
from public.levels l
join (values
  ('University of Education, Winneba',                 'uew',    'UEW',    'Ghana''s premier university for teacher education, based in Winneba.', 4),
  ('Ghana Institute of Management and Public Administration', 'gimpa', 'GIMPA', 'Leading public administration, business and law institution in Accra.', 5),
  ('Ashesi University',                                'ashesi', 'Ashesi', 'Private liberal arts and sciences university in Berekuso, Eastern Region.', 6),
  ('University of Professional Studies, Accra',        'upsa',   'UPSA',   'Public university specialising in business and professional studies.', 7)
) as v(name, slug, abbreviation, description, "order") on true
where l.slug = 'university'
on conflict (level_id, slug) do nothing;

-- ============================================================================
-- PROFESSIONAL â€” new institution
-- ============================================================================
insert into public.institutions (level_id, name, slug, abbreviation, description, "order")
select l.id, v.name, v.slug, v.abbreviation, v.description, v."order"
from public.levels l
join (values
  ('Chartered Institute of Bankers, Ghana', 'cib-ghana', 'CIB Ghana', 'Professional body for the banking industry in Ghana.', 4)
) as v(name, slug, abbreviation, description, "order") on true
where l.slug = 'professional'
on conflict (level_id, slug) do nothing;

-- ============================================================================
-- COURSES (one programme per institution that still lacks content)
-- ============================================================================
-- University programmes
insert into public.courses (institution_id, name, slug, description, "order")
select i.id, v.name, v.slug, v.description, 1
from public.institutions i
join public.levels l on l.id = i.level_id
join (values
  ('knust',  'BSc Mechanical Engineering', 'bsc-mechanical-engineering', 'Undergraduate mechanical engineering programme.'),
  ('ucc',    'BEd Mathematics',            'bed-mathematics',            'Bachelor of Education in Mathematics.'),
  ('uew',    'BEd Basic Education',        'bed-basic-education',        'Bachelor of Education for basic-school teachers.'),
  ('gimpa',  'BSc Business Administration','bsc-business-administration','Undergraduate business administration programme.'),
  ('ashesi', 'BSc Computer Engineering',   'bsc-computer-engineering',   'Undergraduate computer engineering programme.'),
  ('upsa',   'BSc Accounting',             'bsc-accounting',             'Undergraduate accounting programme.')
) as v(inst_slug, name, slug, description) on i.slug = v.inst_slug
where l.slug = 'university'
on conflict (institution_id, slug) do nothing;

-- Professional programmes
insert into public.courses (institution_id, name, slug, description, "order")
select i.id, v.name, v.slug, v.description, 1
from public.institutions i
join public.levels l on l.id = i.level_id
join (values
  ('cimg',      'Professional Diploma in Marketing', 'prof-diploma-marketing', 'CIMG professional marketing diploma.'),
  ('gsl',       'Professional Law Course',           'professional-law-course', 'Post-LLB professional law programme for the Ghana Bar.'),
  ('cib-ghana', 'Chartered Banker Programme',        'chartered-banker',        'Professional banking qualification.')
) as v(inst_slug, name, slug, description) on i.slug = v.inst_slug
where l.slug = 'professional'
on conflict (institution_id, slug) do nothing;

-- ============================================================================
-- SUBJECTS (one per new course; UG already has its subjects)
-- ============================================================================
insert into public.subjects (course_id, name, slug, description, "order")
select c.id, v.name, v.slug, v.description, 1
from public.courses c
join (values
  ('bsc-mechanical-engineering', 'Engineering Mathematics I', 'engineering-mathematics-i', 'Calculus, algebra and trigonometry for engineers.'),
  ('bed-mathematics',            'Calculus I',                'calculus-i',                'Limits, differentiation and applications.'),
  ('bed-basic-education',        'Educational Psychology',    'educational-psychology',    'Theories of learning and development.'),
  ('bsc-business-administration','Principles of Management',  'principles-of-management',  'Foundations of management theory and practice.'),
  ('bsc-computer-engineering',   'Discrete Mathematics',      'discrete-mathematics',      'Logic, sets, graphs and combinatorics.'),
  ('bsc-accounting',             'Financial Accounting',      'financial-accounting',      'Principles and practice of financial accounting.'),
  ('prof-diploma-marketing',     'Marketing Management',      'marketing-management',      'Strategic and operational marketing.'),
  ('professional-law-course',    'Ghana Legal System',        'ghana-legal-system',        'Sources and structure of Ghanaian law.'),
  ('chartered-banker',           'Banking Operations',        'banking-operations',        'Core banking products and operations.')
) as v(course_slug, name, slug, description) on c.slug = v.course_slug
on conflict (course_id, slug) do nothing;

-- Ensure UG BSc Computer Science has an Introduction to Programming subject
-- (created in 0001) â€” no-op if already present.
insert into public.subjects (course_id, name, slug, description, "order")
select c.id, 'Introduction to Programming', 'intro-to-programming', 'First-year programming fundamentals.', 1
from public.courses c
where c.slug = 'bsc-computer-science'
on conflict (course_id, slug) do nothing;

-- ============================================================================
-- Helper note: each paper below is created, then its questions inserted via a
-- CTE that re-resolves the paper id by (course slug, subject slug, year, title).
-- ============================================================================

-- ---- UG > Introduction to Programming (2022) -------------------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2022, 'UG 2022 Introduction to Programming (End of Semester)',
       'First-year programming fundamentals: variables, control flow and algorithms.', 4, 120
from public.subjects s join public.courses c on c.id = s.course_id
where c.slug = 'bsc-computer-science' and s.slug = 'intro-to-programming'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  where c.slug = 'bsc-computer-science' and s.slug = 'intro-to-programming'
    and p.year = 2022 and p.title = 'UG 2022 Introduction to Programming (End of Semester)'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','Which of the following is a valid variable name in most programming languages?','{"A":"2name","B":"_count","C":"my-var","D":"class"}'::jsonb,'B','Identifiers may start with a letter or underscore, cannot start with a digit, cannot contain hyphens, and reserved words like "class" are not allowed.',1),
  (2,'mcq','Which loop checks its condition before executing the body, so it may run zero times?','{"A":"do-while","B":"while","C":"repeat-until","D":"infinite"}'::jsonb,'B','A while loop evaluates the condition first; if it is false initially the body never runs.',1),
  (3,'mcq','A boolean expression evaluates to a value of type','{"A":"integer","B":"string","C":"true or false","D":"floating point"}'::jsonb,'C','Boolean expressions yield one of two values: true or false.',1),
  (4,'mcq','An algorithm is best described as','{"A":"a programming language","B":"a step-by-step procedure to solve a problem","C":"a type of computer","D":"a database"}'::jsonb,'B','An algorithm is a finite, ordered set of steps that solves a problem.',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- KNUST > Engineering Mathematics I (2022) ------------------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2022, 'KNUST 2022 Engineering Mathematics I',
       'Differentiation, integration, trigonometry and matrices.', 4, 180
from public.subjects s join public.courses c on c.id = s.course_id
where c.slug = 'bsc-mechanical-engineering' and s.slug = 'engineering-mathematics-i'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  where c.slug = 'bsc-mechanical-engineering' and s.slug = 'engineering-mathematics-i'
    and p.year = 2022 and p.title = 'KNUST 2022 Engineering Mathematics I'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','Differentiate y = x^2 with respect to x.','{"A":"x","B":"2x","C":"x^2/2","D":"2"}'::jsonb,'B','By the power rule, d/dx(x^n) = n*x^(n-1), so d/dx(x^2) = 2x.',1),
  (2,'mcq','Evaluate the integral of 1/x dx.','{"A":"ln|x| + C","B":"x + C","C":"-1/x^2 + C","D":"1 + C"}'::jsonb,'A','The integral of 1/x is the natural logarithm ln|x| + C.',1),
  (3,'mcq','What is the value of cos 0?','{"A":"0","B":"1","C":"-1","D":"undefined"}'::jsonb,'B','cos 0 = 1.',1),
  (4,'mcq','A matrix with 3 rows and 2 columns has order','{"A":"2 x 3","B":"3 x 2","C":"6","D":"5"}'::jsonb,'B','Matrix order is stated as rows x columns, i.e. 3 x 2.',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- UCC > Calculus I (2021) ----------------------------------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2021, 'UCC 2021 Calculus I',
       'Limits, gradients and differentiation.', 4, 120
from public.subjects s join public.courses c on c.id = s.course_id
where c.slug = 'bed-mathematics' and s.slug = 'calculus-i'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  where c.slug = 'bed-mathematics' and s.slug = 'calculus-i'
    and p.year = 2021 and p.title = 'UCC 2021 Calculus I'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','The limit of (sin x)/x as x approaches 0 is','{"A":"0","B":"1","C":"infinity","D":"undefined"}'::jsonb,'B','This is a standard limit: lim(x->0) (sin x)/x = 1.',1),
  (2,'mcq','The slope of a horizontal line is','{"A":"0","B":"1","C":"undefined","D":"infinite"}'::jsonb,'A','A horizontal line has no vertical change, so its gradient is 0.',1),
  (3,'mcq','Differentiation is primarily used to find the','{"A":"area under a curve","B":"rate of change","C":"total distance","D":"average value"}'::jsonb,'B','The derivative measures the instantaneous rate of change of a function.',1),
  (4,'essay','Differentiate y = 3x^2 + 2x - 5 with respect to x and find the gradient at x = 1.',null::jsonb,'dy/dx = 6x + 2; at x = 1 the gradient is 8.','Differentiate term by term: d/dx(3x^2)=6x, d/dx(2x)=2, d/dx(-5)=0, giving 6x + 2. Substituting x = 1 gives 6(1) + 2 = 8.',6)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- UEW > Educational Psychology (2022) ----------------------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2022, 'UEW 2022 Educational Psychology',
       'Theories of learning, cognition and human development.', 4, 120
from public.subjects s join public.courses c on c.id = s.course_id
where c.slug = 'bed-basic-education' and s.slug = 'educational-psychology'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  where c.slug = 'bed-basic-education' and s.slug = 'educational-psychology'
    and p.year = 2022 and p.title = 'UEW 2022 Educational Psychology'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','The theory that learning occurs through reinforcement is associated with','{"A":"Jean Piaget","B":"B. F. Skinner","C":"Sigmund Freud","D":"Lev Vygotsky"}'::jsonb,'B','Skinner''s operant conditioning explains learning through reinforcement and punishment.',1),
  (2,'mcq','Jean Piaget is best known for his theory of','{"A":"moral development","B":"cognitive development","C":"psychosexual development","D":"operant conditioning"}'::jsonb,'B','Piaget proposed stages of cognitive development in children.',1),
  (3,'mcq','The concept of the Zone of Proximal Development was proposed by','{"A":"Lev Vygotsky","B":"Albert Bandura","C":"Ivan Pavlov","D":"Abraham Maslow"}'::jsonb,'A','Vygotsky described the gap between what a learner can do alone and with guidance.',1),
  (4,'mcq','At the base of Maslow''s hierarchy of needs are','{"A":"self-actualisation needs","B":"esteem needs","C":"physiological needs","D":"safety needs"}'::jsonb,'C','Physiological needs (food, water, shelter) form the foundation of Maslow''s hierarchy.',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- GIMPA > Principles of Management (2023) ------------------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2023, 'GIMPA 2023 Principles of Management',
       'Functions of management, classical theory and organisation.', 4, 120
from public.subjects s join public.courses c on c.id = s.course_id
where c.slug = 'bsc-business-administration' and s.slug = 'principles-of-management'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  where c.slug = 'bsc-business-administration' and s.slug = 'principles-of-management'
    and p.year = 2023 and p.title = 'GIMPA 2023 Principles of Management'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','The four basic functions of management are planning, organising, leading and','{"A":"controlling","B":"marketing","C":"auditing","D":"budgeting"}'::jsonb,'A','The classic functions of management are planning, organising, leading and controlling.',1),
  (2,'mcq','Who proposed the 14 principles of management?','{"A":"Henri Fayol","B":"F. W. Taylor","C":"Elton Mayo","D":"Peter Drucker"}'::jsonb,'A','Henri Fayol set out 14 principles of administrative management.',1),
  (3,'mcq','Scientific management is most associated with','{"A":"Henri Fayol","B":"Frederick Taylor","C":"Max Weber","D":"Abraham Maslow"}'::jsonb,'B','F. W. Taylor is regarded as the father of scientific management.',1),
  (4,'mcq','An organisational chart primarily shows','{"A":"company profit","B":"the formal structure and reporting lines","C":"market share","D":"cash flow"}'::jsonb,'B','An organisational chart depicts formal authority and reporting relationships.',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- Ashesi > Discrete Mathematics (2023) ---------------------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2023, 'Ashesi 2023 Discrete Mathematics',
       'Sets, logic, graph theory and combinatorics.', 4, 120
from public.subjects s join public.courses c on c.id = s.course_id
where c.slug = 'bsc-computer-engineering' and s.slug = 'discrete-mathematics'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  where c.slug = 'bsc-computer-engineering' and s.slug = 'discrete-mathematics'
    and p.year = 2023 and p.title = 'Ashesi 2023 Discrete Mathematics'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','How many subsets does a set with 3 elements have?','{"A":"3","B":"6","C":"8","D":"9"}'::jsonb,'C','A set with n elements has 2^n subsets; 2^3 = 8.',1),
  (2,'mcq','The compound statement "p AND q" is true only when','{"A":"both p and q are true","B":"either p or q is true","C":"both are false","D":"only p is true"}'::jsonb,'A','A conjunction is true exactly when both operands are true.',1),
  (3,'mcq','The negation of "All students passed" is','{"A":"No students passed","B":"All students failed","C":"At least one student did not pass","D":"Some students passed"}'::jsonb,'C','The negation of a universal statement is an existential one: at least one did not pass.',1),
  (4,'mcq','How many edges does the complete graph K4 have?','{"A":"4","B":"5","C":"6","D":"12"}'::jsonb,'C','A complete graph on n vertices has n(n-1)/2 edges; 4*3/2 = 6.',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- UPSA > Financial Accounting (2022) -----------------------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2022, 'UPSA 2022 Financial Accounting',
       'The accounting equation, double entry and financial statements.', 4, 150
from public.subjects s join public.courses c on c.id = s.course_id
where c.slug = 'bsc-accounting' and s.slug = 'financial-accounting'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  where c.slug = 'bsc-accounting' and s.slug = 'financial-accounting'
    and p.year = 2022 and p.title = 'UPSA 2022 Financial Accounting'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','The accounting equation is Assets =','{"A":"Liabilities + Capital","B":"Capital - Liabilities","C":"Income - Expenses","D":"Liabilities - Capital"}'::jsonb,'A','Assets are financed by what is owed (liabilities) and owners'' funds (capital).',1),
  (2,'mcq','A debit entry in an asset account represents','{"A":"a decrease","B":"an increase","C":"no change","D":"a loss"}'::jsonb,'B','Assets increase on the debit side.',1),
  (3,'mcq','Which statement reports performance over a period of time?','{"A":"Statement of financial position","B":"Statement of profit or loss","C":"Trial balance","D":"Cash book"}'::jsonb,'B','The statement of profit or loss (income statement) covers a period; the statement of financial position is at a point in time.',1),
  (4,'essay','State three users of financial statements and explain why each needs the information.',null::jsonb,'Examples: Owners/shareholders (to assess profitability and return); lenders/banks (to assess ability to repay loans); government/GRA (to assess taxes due); employees (job security); suppliers (creditworthiness).','Award marks for any three valid users with a correct reason for each.',6)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- ICAG > Financial Accounting (2022) -----------------------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2022, 'ICAG 2022 Level 1 Financial Accounting',
       'Accounting concepts, depreciation and the trial balance.', 4, 180
from public.subjects s join public.courses c on c.id = s.course_id
where c.slug = 'icag-level-1' and s.slug = 'financial-accounting'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  where c.slug = 'icag-level-1' and s.slug = 'financial-accounting'
    and p.year = 2022 and p.title = 'ICAG 2022 Level 1 Financial Accounting'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','Under the historical cost convention, assets are recorded at','{"A":"market value","B":"original cost","C":"replacement cost","D":"net realisable value"}'::jsonb,'B','Historical cost records assets at the amount originally paid for them.',1),
  (2,'mcq','Depreciation is best described as','{"A":"a loss of cash","B":"the allocation of the cost of a non-current asset over its useful life","C":"an increase in asset value","D":"a liability"}'::jsonb,'B','Depreciation spreads the cost of a non-current asset over the periods that benefit from its use.',1),
  (3,'mcq','The statement that lists all ledger balances to check arithmetic accuracy is the','{"A":"statement of financial position","B":"trial balance","C":"income statement","D":"cash flow statement"}'::jsonb,'B','A trial balance lists all ledger balances to confirm that debits equal credits.',1),
  (4,'essay','Explain the going concern and accruals (matching) concepts in accounting.',null::jsonb,'Going concern assumes the business will continue operating for the foreseeable future, so assets are not valued at break-up values. Accruals (matching) requires income and the expenses incurred in earning it to be recognised in the same period, regardless of when cash is received or paid.','Award marks for a correct explanation of each concept.',6)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- CIMG > Marketing Management (2022) -----------------------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2022, 'CIMG 2022 Marketing Management',
       'Marketing mix, segmentation, strategy and pricing.', 4, 120
from public.subjects s join public.courses c on c.id = s.course_id
where c.slug = 'prof-diploma-marketing' and s.slug = 'marketing-management'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  where c.slug = 'prof-diploma-marketing' and s.slug = 'marketing-management'
    and p.year = 2022 and p.title = 'CIMG 2022 Marketing Management'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','The 4Ps of the marketing mix are Product, Price, Place and','{"A":"Promotion","B":"People","C":"Profit","D":"Process"}'::jsonb,'A','The traditional marketing mix consists of Product, Price, Place and Promotion.',1),
  (2,'mcq','Market segmentation is best described as','{"A":"lowering prices","B":"dividing a market into distinct groups of buyers","C":"advertising on television","D":"exporting goods"}'::jsonb,'B','Segmentation splits a market into groups with similar needs or characteristics.',1),
  (3,'mcq','A SWOT analysis examines Strengths, Weaknesses, Opportunities and','{"A":"Threats","B":"Targets","C":"Trends","D":"Taxes"}'::jsonb,'A','SWOT stands for Strengths, Weaknesses, Opportunities and Threats.',1),
  (4,'mcq','The pricing strategy that sets a high initial price for a new product is called','{"A":"penetration pricing","B":"price skimming","C":"loss-leader pricing","D":"discount pricing"}'::jsonb,'B','Price skimming sets a high launch price, then lowers it over time.',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- Ghana School of Law > Ghana Legal System (2022) ----------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2022, 'GSL 2022 Ghana Legal System',
       'Sources of law, the courts and the arms of government.', 4, 180
from public.subjects s join public.courses c on c.id = s.course_id
where c.slug = 'professional-law-course' and s.slug = 'ghana-legal-system'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  where c.slug = 'professional-law-course' and s.slug = 'ghana-legal-system'
    and p.year = 2022 and p.title = 'GSL 2022 Ghana Legal System'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','The supreme law of Ghana is the','{"A":"Criminal Offences Act","B":"1992 Constitution","C":"English common law","D":"Companies Act"}'::jsonb,'B','The 1992 Constitution is the supreme law of Ghana; any law inconsistent with it is void.',1),
  (2,'mcq','The highest court in Ghana is the','{"A":"High Court","B":"Court of Appeal","C":"Supreme Court","D":"Circuit Court"}'::jsonb,'C','The Supreme Court is the apex court of Ghana.',1),
  (3,'mcq','The arm of government responsible for making laws in Ghana is','{"A":"the Judiciary","B":"Parliament","C":"the Police Service","D":"the Executive alone"}'::jsonb,'B','Parliament is the legislature and makes the laws of Ghana.',1),
  (4,'essay','State the three arms of government in Ghana and the main function of each.',null::jsonb,'The Executive implements and enforces laws; the Legislature (Parliament) makes laws; the Judiciary interprets laws and settles disputes.','Award marks for naming each arm and giving its correct primary function.',6)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ---- CIB Ghana > Banking Operations (2023) --------------------------------
insert into public.papers (subject_id, year, title, description, total_questions, duration_minutes)
select s.id, 2023, 'CIB Ghana 2023 Banking Operations',
       'Central banking, payment instruments and customer due diligence.', 4, 120
from public.subjects s join public.courses c on c.id = s.course_id
where c.slug = 'chartered-banker' and s.slug = 'banking-operations'
on conflict (subject_id, year, title) do nothing;

with paper as (
  select p.id from public.papers p
  join public.subjects s on s.id = p.subject_id
  join public.courses c on c.id = s.course_id
  where c.slug = 'chartered-banker' and s.slug = 'banking-operations'
    and p.year = 2023 and p.title = 'CIB Ghana 2023 Banking Operations'
)
insert into public.questions (paper_id, number, type, content, options, answer, explanation, marks)
select paper.id, q.number, q.type::public.question_type, q.content, q.options, q.answer, q.explanation, q.marks
from paper join (values
  (1,'mcq','The central bank of Ghana is the','{"A":"Ghana Commercial Bank","B":"Bank of Ghana","C":"Ecobank Ghana","D":"ARB Apex Bank"}'::jsonb,'B','The Bank of Ghana is the central bank and regulator of the banking sector.',1),
  (2,'mcq','A cheque marked "Account Payee Only" is','{"A":"an open cheque","B":"a crossed cheque","C":"a bearer cheque","D":"a post-dated cheque"}'::jsonb,'B','Such a cheque is crossed and can only be paid into the named payee''s account.',1),
  (3,'mcq','In banking, KYC stands for','{"A":"Keep Your Cash","B":"Know Your Customer","C":"Know Your Credit","D":"Keep Your Credit"}'::jsonb,'B','KYC (Know Your Customer) is the process of verifying customer identity.',1),
  (4,'mcq','The charge a bank levies on money it lends is called the','{"A":"dividend","B":"interest (lending) rate","C":"commission","D":"levy"}'::jsonb,'B','Interest, expressed as a lending rate, is the cost of borrowing from a bank.',1)
) as q(number,type,content,options,answer,explanation,marks) on true
on conflict (paper_id, number) do nothing;

-- ============================================================================
-- Done.
-- ============================================================================

