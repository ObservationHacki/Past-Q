import "server-only";
import type { Question } from "@/types";
import {
  explainAnswer,
  generatePracticeQuestions,
  type ExplainMode,
  type GeneratedQuestion,
} from "@/lib/gemini";
import { isSnwolleyConfigured, snwolleyExplain, snwolleyPractice } from "@/lib/snwolley";

/**
 * Unified AI tutor layer. Prefers the Snwolley Agents API when its key is
 * configured, otherwise falls back to Gemini. Throws if no provider succeeds;
 * callers are expected to provide a final non-AI fallback.
 */

export async function aiExplain(
  question: Question,
  studentAnswer: string | null,
  mode: ExplainMode,
): Promise<string> {
  if (isSnwolleyConfigured()) {
    try {
      return await snwolleyExplain(question, studentAnswer, mode);
    } catch (err) {
      console.error("Snwolley explain failed, trying Gemini:", err);
    }
  }
  return explainAnswer({ question, studentAnswer, mode });
}

export async function aiPractice(question: Question): Promise<GeneratedQuestion[]> {
  if (isSnwolleyConfigured()) {
    try {
      const questions = await snwolleyPractice(question);
      if (questions.length > 0) return questions;
    } catch (err) {
      console.error("Snwolley practice failed, trying Gemini:", err);
    }
  }
  return generatePracticeQuestions(question);
}
