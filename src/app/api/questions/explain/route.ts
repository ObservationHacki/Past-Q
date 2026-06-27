import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { explainAnswer, streamExplanation, type ExplainMode } from "@/lib/gemini";
import type { Question } from "@/types";

interface ExplainRequestBody {
  questionId?: string;
  studentAnswer?: string | null;
  mode?: ExplainMode;
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

  // Hints are short — return them as plain JSON.
  if (mode === "hint") {
    try {
      const explanation = await explainAnswer({ question, studentAnswer, mode: "hint" });
      return NextResponse.json({ explanation });
    } catch (err) {
      console.error("hint generation failed:", err);
      return NextResponse.json(
        { error: "Could not generate a hint right now." },
        { status: 502 },
      );
    }
  }

  // Explanations stream token-by-token for an instant feel.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamExplanation({ question, studentAnswer })) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        console.error("explanation stream failed:", err);
        controller.enqueue(
          encoder.encode("\n\n(Sorry — the explanation could not be completed.)"),
        );
      } finally {
        controller.close();
      }
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
