import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePracticeQuestions } from "@/lib/gemini";
import type { Question } from "@/types";

interface PracticeRequestBody {
  questionId?: string;
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

  try {
    const questions = await generatePracticeQuestions(question);
    if (questions.length === 0) {
      return NextResponse.json(
        { error: "Could not generate practice questions. Please try again." },
        { status: 502 },
      );
    }
    return NextResponse.json({ questions });
  } catch (err) {
    console.error("practice generation failed:", err);
    return NextResponse.json(
      { error: "Could not generate practice questions right now." },
      { status: 502 },
    );
  }
}
