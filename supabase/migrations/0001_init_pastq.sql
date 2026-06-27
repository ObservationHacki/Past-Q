-- ============================================================================
-- PastQ — Ghana Exam Past Questions Platform
-- Initial schema migration
--
-- Hierarchy: levels → institutions → courses → subjects → papers → questions
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
  content_search tsvector generated always as (to_tsvector('english', coalesce(content, ''))) stored,
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
create index if not exists idx_questions_content_search
  on public.questions using gin (content_search);

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
-- SEED DATA  (idempotent — safe to re-run)
-- ============================================================================

-- ---- Levels ----------------------------------------------------------------
insert into public.levels (name, slug, description, "order") values
  ('BECE',         'bece',         'Basic Education Certificate Examination — taken at the end of Junior High School (JHS 3).', 1),
  ('WASSCE',       'wassce',       'West African Senior School Certificate Examination — taken at the end of Senior High School (SHS 3).', 2),
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
-- BECE › WAEC › Core subjects programme
insert into public.courses (institution_id, name, slug, description, "order")
select i.id, 'JHS Core Programme', 'jhs-core', 'Core subjects examined at the BECE level.', 1
from public.institutions i
join public.levels l on l.id = i.level_id
where l.slug = 'bece' and i.slug = 'waec'
on conflict (institution_id, slug) do nothing;

-- WASSCE › WAEC › General Science / General Arts / Business
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

-- University › UG › BSc Computer Science
insert into public.courses (institution_id, name, slug, description, "order")
select i.id, 'BSc Computer Science', 'bsc-computer-science', 'Undergraduate computer science degree programme.', 1
from public.institutions i
join public.levels l on l.id = i.level_id
where l.slug = 'university' and i.slug = 'university-of-ghana'
on conflict (institution_id, slug) do nothing;

-- Professional › ICAG › Level 1
insert into public.courses (institution_id, name, slug, description, "order")
select i.id, 'ICAG Level 1', 'icag-level-1', 'Foundation level of the ICAG professional qualification.', 1
from public.institutions i
join public.levels l on l.id = i.level_id
where l.slug = 'professional' and i.slug = 'icag'
on conflict (institution_id, slug) do nothing;

-- ---- Subjects --------------------------------------------------------------
-- BECE › JHS Core Programme
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

-- WASSCE › General Science
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

-- University › BSc Computer Science
insert into public.subjects (course_id, name, slug, description, "order")
select c.id, v.name, v.slug, v.description, v."order"
from public.courses c
join (values
  ('Introduction to Programming', 'intro-to-programming', 'First-year programming fundamentals.', 1),
  ('Data Structures and Algorithms', 'data-structures-algorithms', 'Core data structures and algorithms.', 2)
) as v(name, slug, description, "order") on true
where c.slug = 'bsc-computer-science'
on conflict (course_id, slug) do nothing;

-- Professional › ICAG Level 1
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
