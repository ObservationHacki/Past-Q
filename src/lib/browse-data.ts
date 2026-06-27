import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Institution, Level, Paper, Question, Subject } from "@/types";

type DB = Awaited<ReturnType<typeof createClient>>;

async function getLevelId(supabase: DB, levelSlug: string): Promise<string | null> {
  const { data } = await supabase
    .from("levels")
    .select("id")
    .eq("slug", levelSlug)
    .maybeSingle();
  return data?.id ?? null;
}

async function getInstitutionId(
  supabase: DB,
  levelSlug: string,
  institutionSlug: string,
): Promise<string | null> {
  const levelId = await getLevelId(supabase, levelSlug);
  if (!levelId) return null;

  const { data } = await supabase
    .from("institutions")
    .select("id")
    .eq("level_id", levelId)
    .eq("slug", institutionSlug)
    .maybeSingle();
  return data?.id ?? null;
}

/** Left panel — all exam levels, ordered. */
export async function getLevels(): Promise<Level[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("levels")
    .select("*")
    .order("order", { ascending: true });
  return (data ?? []) as Level[];
}

/** Middle panel — institutions for a given level. */
export async function getInstitutions(levelSlug: string): Promise<Institution[]> {
  const supabase = await createClient();
  const levelId = await getLevelId(supabase, levelSlug);
  if (!levelId) return [];

  const { data } = await supabase
    .from("institutions")
    .select("*")
    .eq("level_id", levelId)
    .order("order", { ascending: true });
  return (data ?? []) as Institution[];
}

/**
 * Middle panel — subjects for a given institution. Subjects live under courses,
 * so we filter through the `courses` relationship (the URL skips the course layer).
 */
export async function getSubjects(
  levelSlug: string,
  institutionSlug: string,
): Promise<Subject[]> {
  const supabase = await createClient();
  const institutionId = await getInstitutionId(supabase, levelSlug, institutionSlug);
  if (!institutionId) return [];

  const { data } = await supabase
    .from("subjects")
    .select("*, courses!inner(institution_id)")
    .eq("courses.institution_id", institutionId)
    .order("order", { ascending: true });

  return ((data ?? []) as unknown as Subject[]).map(
    ({ id, course_id, name, slug, description, order, created_at, updated_at }) => ({
      id,
      course_id,
      name,
      slug,
      description,
      order,
      created_at,
      updated_at,
    }),
  );
}

/** Right panel — papers for a subject, newest year first. */
export async function getPapers(
  levelSlug: string,
  institutionSlug: string,
  subjectSlug: string,
): Promise<Paper[]> {
  const supabase = await createClient();
  const institutionId = await getInstitutionId(supabase, levelSlug, institutionSlug);
  if (!institutionId) return [];

  const { data: subject } = await supabase
    .from("subjects")
    .select("id, courses!inner(institution_id)")
    .eq("courses.institution_id", institutionId)
    .eq("slug", subjectSlug)
    .limit(1)
    .maybeSingle();

  const subjectId = (subject as { id?: string } | null)?.id;
  if (!subjectId) return [];

  const { data } = await supabase
    .from("papers")
    .select("*")
    .eq("subject_id", subjectId)
    .order("year", { ascending: false });
  return (data ?? []) as Paper[];
}

/** Right panel — a single paper plus its questions, for the preview view. */
export async function getPaperWithQuestions(
  paperId: string,
): Promise<{ paper: Paper | null; questions: Question[] }> {
  const supabase = await createClient();

  const { data: paper } = await supabase
    .from("papers")
    .select("*")
    .eq("id", paperId)
    .maybeSingle();

  if (!paper) return { paper: null, questions: [] };

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("paper_id", paperId)
    .order("number", { ascending: true });

  return { paper: paper as Paper, questions: (questions ?? []) as Question[] };
}
