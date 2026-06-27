import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Question } from "@/types";

const PAGE_SIZE = 20;

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** A single search hit returned by the `search_questions` RPC. */
export interface SearchResult extends Question {
  paper_title: string;
  year: number;
  subject_id: string;
  subject_name: string;
  institution_id: string;
  institution_name: string;
  level_id: string;
}

interface SearchRow extends SearchResult {
  total_count: number;
}

/** Resolve a filter to an id, accepting either an explicit id or a slug. */
async function resolveId(
  supabase: SupabaseClient,
  table: "levels" | "institutions" | "subjects",
  idValue: string | null,
  slugValue: string | null,
): Promise<string | null> {
  if (idValue) return idValue;
  if (!slugValue) return null;

  const { data } = await supabase
    .from(table)
    .select("id")
    .eq("slug", slugValue)
    .limit(1)
    .maybeSingle();

  return (data as { id?: string } | null)?.id ?? null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const query = (searchParams.get("q") ?? "").trim();
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const yearRaw = searchParams.get("year");
  const year = yearRaw && /^\d{4}$/.test(yearRaw) ? Number.parseInt(yearRaw, 10) : null;

  const supabase = await createClient();

  const [levelId, institutionId, subjectId] = await Promise.all([
    resolveId(supabase, "levels", searchParams.get("level_id"), searchParams.get("level")),
    resolveId(
      supabase,
      "institutions",
      searchParams.get("institution_id"),
      searchParams.get("institution"),
    ),
    resolveId(supabase, "subjects", searchParams.get("subject_id"), searchParams.get("subject")),
  ]);

  const { data, error } = await supabase.rpc("search_questions", {
    search_query: query,
    filter_level_id: levelId,
    filter_institution_id: institutionId,
    filter_subject_id: subjectId,
    filter_year: year,
    result_limit: PAGE_SIZE,
    result_offset: (page - 1) * PAGE_SIZE,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as SearchRow[];
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  const results: SearchResult[] = rows.map(({ total_count: _total, ...rest }) => rest);

  return NextResponse.json({
    query,
    results,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}
