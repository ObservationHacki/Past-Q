import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePracticeQuestions, type GeneratedQuestion } from "@/lib/gemini";
import type { Question } from "@/types";

interface PracticeRequestBody {
  questionId?: string;
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Fallback when AI generation is unavailable (e.g. Gemini quota exhausted):
 * pull up to 3 real MCQs from the same subject as the source question.
 */
async function relatedQuestionsFromLibrary(
  supabase: SupabaseClient,
  question: Question,
): Promise<GeneratedQuestion[]> {
  const { data: paper } = await supabase
    .from("papers")
    .select("subject_id")
    .eq("id", question.paper_id)
    .maybeSingle<{ subject_id: string }>();

  if (!paper?.subject_id) return [];

  const { data: papers } = await supabase
    .from("papers")
    .select("id")
    .eq("subject_id", paper.subject_id);

  const paperIds = (papers ?? []).map((p) => (p as { id: string }).id);
  if (paperIds.length === 0) return [];

  const { data: related } = await supabase
    .from("questions")
    .select("*")
    .in("paper_id", paperIds)
    .eq("type", "mcq")
    .neq("id", question.id)
    .limit(12);

  return ((related ?? []) as Question[])
    .filter((q) => q.options && q.answer && Object.keys(q.options).length >= 2)
    .slice(0, 3)
    .map((q) => ({
      content: q.content,
      options: q.options as Record<string, string>,
      answer: q.answer as string,
      explanation: q.explanation ?? "",
    }));
}

export async function POST(request: Request) {
  let body: PracticeRequestBody;
  try {
    body = (await request.json()) as PracticeRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.questionId) {
    return NextResponse.json({ error: "questionId is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: question, error } = await supabase
    .from("questions")
    .select("*")
    .eq("id", body.questionId)
    .maybeSingle<Question>();

  if (error) {
    return NextResponse.json({ error: "Failed to load question." }, { status: 500 });
  }
  if (!question) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  // Prefer AI-generated questions; fall back to the question bank if the AI
  // call fails (e.g. Gemini quota/rate limit) or returns nothing.
  try {
    const questions = await generatePracticeQuestions(question);
    if (questions.length > 0) {
      return NextResponse.json({ questions, source: "ai" });
    }
  } catch (err) {
    console.error("practice generation failed, falling back to library:", err);
  }

  const fallback = await relatedQuestionsFromLibrary(supabase, question);
  if (fallback.length > 0) {
    return NextResponse.json({ questions: fallback, source: "library" });
  }

  return NextResponse.json(
    {
      error:
        "No practice questions available right now. The AI tutor is out of quota and there aren't enough related questions in the bank yet.",
    },
    { status: 502 },
  );
}
