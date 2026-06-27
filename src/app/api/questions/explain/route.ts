import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ExplainMode } from "@/lib/gemini";
import { aiExplain } from "@/lib/ai";
import type { Question } from "@/types";

interface ExplainRequestBody {
  questionId?: string;
  studentAnswer?: string | null;
  mode?: ExplainMode;
}

/** A useful explanation built from stored data, used when the AI is unavailable. */
function buildFallbackExplanation(
  question: Question,
  studentAnswer: string | null,
): string {
  const parts: string[] = [];

  if (question.type === "mcq" && question.answer) {
    const optionText = question.options?.[question.answer];
    parts.push(
      `The correct answer is ${question.answer}${optionText ? `: ${optionText}` : ""}.`,
    );
    if (studentAnswer && studentAnswer !== question.answer) {
      const chosen = question.options?.[studentAnswer];
      parts.push(
        `You chose ${studentAnswer}${chosen ? `: ${chosen}` : ""}, which is not correct.`,
      );
    }
  } else if (question.answer?.trim()) {
    parts.push(`Model answer: ${question.answer.trim()}`);
  }

  if (question.explanation?.trim()) parts.push(question.explanation.trim());

  if (parts.length === 0) {
    parts.push(
      "Review this topic in your notes and try a similar question to reinforce the concept.",
    );
  }
  return parts.join(" ");
}

/** A safe hint that does not reveal the answer, used when the AI is unavailable. */
function buildFallbackHint(question: Question): string {
  if (question.type === "mcq") {
    return "Read the question carefully and rule out the options you know are wrong. Focus on the key concept being tested rather than guessing.";
  }
  return "Identify the main concept this question is testing and jot down the key points before writing your full answer.";
}

export async function POST(request: Request) {
  let body: ExplainRequestBody;
  try {
    body = (await request.json()) as ExplainRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { questionId, studentAnswer, mode } = body;

  if (!questionId) {
    return NextResponse.json({ error: "questionId is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: question, error } = await supabase
    .from("questions")
    .select("*")
    .eq("id", questionId)
    .maybeSingle<Question>();

  if (error) {
    return NextResponse.json({ error: "Failed to load question." }, { status: 500 });
  }
  if (!question) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  // Hints are short — return them as plain JSON. Fall back to a safe generic
  // hint if no AI provider is available.
  if (mode === "hint") {
    try {
      const explanation = await aiExplain(question, studentAnswer ?? null, "hint");
      return NextResponse.json({ explanation });
    } catch (err) {
      console.error("hint generation failed, using fallback hint:", err);
      return NextResponse.json({ explanation: buildFallbackHint(question) });
    }
  }

  // Explanation: get the text from the AI provider (Snwolley → Gemini), then
  // drip it to the client so the typewriter effect still plays. If every
  // provider fails, stream the stored explanation so the card is never empty.
  const encoder = new TextEncoder();
  let text: string;
  try {
    text = await aiExplain(question, studentAnswer ?? null, "explain");
  } catch (err) {
    console.error("explanation failed, using stored fallback:", err);
    text = buildFallbackExplanation(question, studentAnswer ?? null);
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Chunk into ~6-char slices so the client's typewriter reveal stays smooth.
      for (let i = 0; i < text.length; i += 6) {
        controller.enqueue(encoder.encode(text.slice(i, i + 6)));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
