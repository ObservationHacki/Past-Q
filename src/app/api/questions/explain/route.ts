import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { explainAnswer, streamExplanation, type ExplainMode } from "@/lib/gemini";
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
  // hint if the AI is unavailable (e.g. Gemini quota exhausted).
  if (mode === "hint") {
    try {
      const explanation = await explainAnswer({ question, studentAnswer, mode: "hint" });
      return NextResponse.json({ explanation });
    } catch (err) {
      console.error("hint generation failed, using fallback hint:", err);
      return NextResponse.json({ explanation: buildFallbackHint(question) });
    }
  }

  // Explanations stream token-by-token for an instant feel. If the AI yields
  // nothing or errors, stream the stored explanation so the card is never empty.
  const encoder = new TextEncoder();
  const fallback = buildFallbackExplanation(question, studentAnswer ?? null);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let emitted = false;
      try {
        for await (const chunk of streamExplanation({ question, studentAnswer })) {
          if (chunk) {
            emitted = true;
            controller.enqueue(encoder.encode(chunk));
          }
        }
      } catch (err) {
        console.error("explanation stream failed, using stored fallback:", err);
      }
      if (!emitted) {
        controller.enqueue(encoder.encode(fallback));
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
