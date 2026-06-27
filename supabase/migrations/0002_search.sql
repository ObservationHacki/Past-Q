-- ============================================================================
-- PastQ — Full-text search support
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
