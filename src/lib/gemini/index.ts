import "server-only";
import { GoogleGenerativeAI, type ModelParams } from "@google/generative-ai";
import type { Question } from "@/types";

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GHANA_CONTEXT =
  "You are an expert tutor for the Ghanaian curriculum (GES / NaCCA syllabus), " +
  "preparing students for the BECE, WASSCE and related examinations. Use Ghanaian " +
  "context, examples and SI units where helpful, and language a JHS/SHS student can follow.";

export type ExplainMode = "explain" | "hint";

export interface ExplainAnswerInput {
  question: Question;
  studentAnswer?: string | null;
  mode?: ExplainMode;
}

export interface GeneratedQuestion {
  content: string;
  options: Record<string, string>;
  answer: string;
  explanation: string;
}

function getModel(params: Partial<ModelParams> = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: GEMINI_MODEL, ...params });
}

function buildPrompt(
  question: Question,
  studentAnswer: string | null,
  mode: ExplainMode,
): string {
  const lines: string[] = [GHANA_CONTEXT, ""];

  if (mode === "hint") {
    lines.push(
      "Give ONE short hint (1-2 sentences) pointing the student in the right direction WITHOUT revealing the answer.",
    );
  } else {
    lines.push(
      "Explain clearly and concisely (3-6 sentences) why the correct answer is right.",
    );
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
    if (question.explanation) {
      lines.push(`Reference explanation (ground truth): ${question.explanation}`);
    }
  }

  if (studentAnswer) {
    lines.push(`The student answered: ${studentAnswer}`);
    if (mode === "explain") {
      lines.push("If the student was wrong, gently point out the likely misconception.");
    }
  }

  lines.push("", "Respond in plain prose. Do not use markdown headings.");
  return lines.join("\n");
}

/** Non-streaming explanation/hint (used for short hints). */
export async function explainAnswer({
  question,
  studentAnswer,
  mode = "explain",
}: ExplainAnswerInput): Promise<string> {
  const model = getModel();
  const result = await model.generateContent(
    buildPrompt(question, studentAnswer ?? null, mode),
  );
  const text = result.response.text().trim();
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

/** Streams a full explanation as text chunks. */
export async function* streamExplanation({
  question,
  studentAnswer,
}: Omit<ExplainAnswerInput, "mode">): AsyncGenerator<string> {
  const model = getModel();
  const result = await model.generateContentStream(
    buildPrompt(question, studentAnswer ?? null, "explain"),
  );

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

/** Generates 3 new MCQ practice questions on the same concept. */
export async function generatePracticeQuestions(
  question: Question,
): Promise<GeneratedQuestion[]> {
  const model = getModel({
    generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
  });

  const prompt = [
    GHANA_CONTEXT,
    "",
    "Create exactly 3 NEW multiple-choice practice questions that test the SAME concept",
    "as the question below, at a similar difficulty. Each must have four options keyed",
    'A, B, C, D, exactly one correct answer, and a one-sentence explanation.',
    "",
    `Source question (${question.type}): ${question.content}`,
    question.options
      ? `Source options: ${Object.entries(question.options)
          .map(([k, v]) => `${k}) ${v}`)
          .join(", ")}`
      : "",
    question.answer ? `Source correct answer: ${question.answer}` : "",
    "",
    'Return ONLY a JSON array of objects with this exact shape:',
    '[{"content": string, "options": {"A": string, "B": string, "C": string, "D": string}, "answer": "A"|"B"|"C"|"D", "explanation": string}]',
  ]
    .filter(Boolean)
    .join("\n");

  const result = await model.generateContent(prompt);
  const raw = result.response.text();
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

/** Strips ```json fences if the model wrapped its output. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return text.trim();
}
