"use client";

import { useEffect, useState } from "react";

interface GeneratedQuestion {
  content: string;
  options: Record<string, string>;
  answer: string;
  explanation: string;
}

export default function PracticeModal({
  questionId,
  onClose,
}: {
  questionId: string;
  onClose: () => void;
}) {
  const [questions, setQuestions] = useState<GeneratedQuestion[] | null>(null);
  const [source, setSource] = useState<"ai" | "library">("ai");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/questions/practice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to generate questions.");
        return json as { questions: GeneratedQuestion[]; source?: "ai" | "library" };
      })
      .then((json) => {
        setQuestions(json.questions);
        setSource(json.source ?? "ai");
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setLoading(false);
      });

    return () => controller.abort();
  }, [questionId]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="flex h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:h-auto sm:max-h-[80vh] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">Bonus practice</p>
            {!loading && !error && <SourceBadge source={source} />}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : (
            questions?.map((q, i) => (
              <PracticeCard key={i} index={i + 1} question={q} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function PracticeCard({
  index,
  question,
}: {
  index: number;
  question: GeneratedQuestion;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const answered = selected !== null;

  return (
    <article className="rounded-xl border border-gray-200 p-4">
      <p className="text-sm font-medium text-gray-900">
        <span className="text-gray-400">{index}. </span>
        {question.content}
      </p>

      <div className="mt-3 grid gap-2">
        {Object.entries(question.options).map(([key, value]) => {
          const isCorrect = answered && key === question.answer;
          const isWrongPick = answered && key === selected && key !== question.answer;
          return (
            <button
              key={key}
              type="button"
              disabled={answered}
              onClick={() => setSelected(key)}
              className={[
                "flex items-start gap-2 rounded-lg border p-2.5 text-left text-sm transition-colors",
                isCorrect
                  ? "border-green-500 bg-green-50 text-green-800"
                  : isWrongPick
                    ? "border-red-500 bg-red-50 text-red-800"
                    : answered
                      ? "border-gray-200 text-gray-400"
                      : "border-gray-200 text-gray-700 hover:border-gray-900 hover:bg-gray-50",
              ].join(" ")}
            >
              <span className="font-semibold">{key}.</span>
              <span>{value}</span>
            </button>
          );
        })}
      </div>

      {answered && question.explanation && (
        <p className="mt-3 rounded-lg bg-blue-50/60 px-3 py-2 text-xs leading-relaxed text-gray-700">
          {question.explanation}
        </p>
      )}
    </article>
  );
}

function SourceBadge({ source }: { source: "ai" | "library" }) {
  if (source === "library") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        </svg>
        From question bank
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-700">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9L12 2z" />
      </svg>
      AI generated
    </span>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <p className="text-center text-sm text-gray-500">
        Generating fresh practice questions…
      </p>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-100 p-4">
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="h-9 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
