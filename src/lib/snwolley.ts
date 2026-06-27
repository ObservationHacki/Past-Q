import "server-only";
import type { Question } from "@/types";
import type { GeneratedQuestion } from "@/lib/gemini";

const CHAT_URL = "https://v1.snwolley.ai/v1/chat/completions";
const CHAT_MODEL = process.env.SNWOLLEY_MODEL ?? "snwolley-chat";

const RAW_API_KEY = process.env.SNWOLLEY_API_KEY?.trim();
const API_KEY =
  RAW_API_KEY && RAW_API_KEY !== "your-snwolley-api-key" ? RAW_API_KEY : undefined;

const GHANA_CONTEXT =
  "You are an expert tutor for the Ghanaian curriculum (GES / NaCCA syllabus), " +
  "preparing students for the BECE, WASSCE and related examinations. Use Ghanaian " +
  "context, examples and SI units where helpful, and language a JHS/SHS student can follow.";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function isSnwolleyConfigured(): boolean {
  return Boolean(API_KEY);
}

/** Calls the Snwolley (OpenAI-compatible) chat completions endpoint. */
async function snwolleyChat(
  messages: ChatMessage[],
  options: { temperature?: number } = {},
): Promise<string> {
  if (!API_KEY) throw new Error("SNWOLLEY_API_KEY is not configured.");

  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      temperature: options.temperature ?? 0.3,
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Snwolley chat failed (${res.status}): ${raw.slice(0, 200)}`);
  }

  const data = safeJson(raw);
  const content: unknown =
    data?.choices?.[0]?.message?.content ?? data?.message?.content ?? data?.content;

  const text = typeof content === "string" ? content.trim() : "";
  if (!text) throw new Error("Snwolley returned an empty response.");
  return text;
}

/** Builds an explanation or a no-spoiler hint for a question. */
export async function snwolleyExplain(
  question: Question,
  studentAnswer: string | null,
  mode: "explain" | "hint",
): Promise<string> {
  const lines: string[] = [];

  if (mode === "hint") {
    lines.push(
      "Give ONE short hint (1-2 sentences) pointing the student in the right direction WITHOUT revealing the answer.",
    );
  } else {
    lines.push("Explain clearly and concisely (3-6 sentences) why the correct answer is right.");
  }

  lines.push("", `Question type: ${question.type}`, `Question: ${question.content}`);

  if (question.options) {
    lines.push(
      "Options:",
      Object.entries(question.options)
        .map(([k, v]) => `${k}. ${v}`)
        .join("\n"),
    );
  }

  if (mode === "explain") {
    if (question.answer) lines.push(`Correct answer: ${question.answer}`);
    if (question.explanation) lines.push(`Reference explanation: ${question.explanation}`);
  }

  if (studentAnswer) {
    lines.push(`The student answered: ${studentAnswer}`);
    if (mode === "explain") {
      lines.push("If the student was wrong, gently point out the likely misconception.");
    }
  }

  lines.push("", "Respond in plain prose. Do not use markdown headings.");

  return snwolleyChat(
    [
      { role: "system", content: GHANA_CONTEXT },
      { role: "user", content: lines.join("\n") },
    ],
    { temperature: mode === "hint" ? 0.4 : 0.3 },
  );
}

/** Generates up to 3 fresh MCQ practice questions on the same concept. */
export async function snwolleyPractice(question: Question): Promise<GeneratedQuestion[]> {
  const user = [
    "Create exactly 3 NEW multiple-choice practice questions that test the SAME concept",
    "as the question below, at a similar difficulty. Each must have four options keyed",
    "A, B, C, D, exactly one correct answer, and a one-sentence explanation.",
    "",
    `Source question (${question.type}): ${question.content}`,
    question.options
      ? `Source options: ${Object.entries(question.options)
          .map(([k, v]) => `${k}) ${v}`)
          .join(", ")}`
      : "",
    question.answer ? `Source correct answer: ${question.answer}` : "",
    "",
    "Return ONLY a JSON array of objects with this exact shape, no prose or markdown:",
    '[{"content": string, "options": {"A": string, "B": string, "C": string, "D": string}, "answer": "A"|"B"|"C"|"D", "explanation": string}]',
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await snwolleyChat(
    [
      { role: "system", content: GHANA_CONTEXT },
      { role: "user", content: user },
    ],
    { temperature: 0.7 },
  );

  const parsed = JSON.parse(extractJson(raw));
  const list: unknown[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { questions?: unknown[] })?.questions)
      ? (parsed as { questions: unknown[] }).questions
      : [];

  return list
    .map(normalizeGenerated)
    .filter((q): q is GeneratedQuestion => q !== null)
    .slice(0, 3);
}

function normalizeGenerated(value: unknown): GeneratedQuestion | null {
  if (!value || typeof value !== "object") return null;
  const q = value as Record<string, unknown>;
  const rawOptions = q.options;
  if (!q.content || !rawOptions || typeof rawOptions !== "object") return null;

  const options: Record<string, string> = {};
  for (const key of ["A", "B", "C", "D"]) {
    const v = (rawOptions as Record<string, unknown>)[key];
    if (typeof v === "string") options[key] = v;
  }
  if (Object.keys(options).length < 2) return null;

  const answer = String(q.answer ?? "").trim().toUpperCase().slice(0, 1);

  return {
    content: String(q.content),
    options,
    answer: options[answer] ? answer : Object.keys(options)[0],
    explanation: typeof q.explanation === "string" ? q.explanation : "",
  };
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

function safeJson(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
