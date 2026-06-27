-- ============================================================================
-- PastQ — RESET (DESTRUCTIVE)
--
-- Run this ONCE if you hit errors like:
--   ERROR: 42703: column "course_id" does not exist
-- which mean an older/incompatible PastQ schema already exists on the project.
--
-- This drops the PastQ catalog tables (and any test progress rows) so that
-- seed_all.sql can recreate the schema cleanly. It does NOT touch Supabase auth
-- users or any tables outside the list below.
--
-- After running this, run supabase/seed_all.sql.
-- ============================================================================

drop function if exists public.get_dashboard_stats() cascade;
drop function if exists public.search_questions(
  text, uuid, uuid, uuid, integer, integer, integer
) cascade;

drop table if exists public.user_progress cascade;
drop table if exists public.questions     cascade;
drop table if exists public.papers        cascade;
drop table if exists public.subjects      cascade;
drop table if exists public.courses       cascade;
drop table if exists public.institutions  cascade;
drop table if exists public.levels        cascade;

-- The question_type enum is recreated idempotently by seed_all.sql; drop it too
-- so a clean type is guaranteed.
drop type if exists public.question_type cascade;

-- ============================================================================
-- Done. Now run supabase/seed_all.sql
-- ============================================================================
