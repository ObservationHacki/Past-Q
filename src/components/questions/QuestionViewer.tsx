"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PaperContext } from "@/lib/browse-data";
import InstitutionAvatar from "@/components/ui/InstitutionAvatar";
import VoiceExamMode from "@/components/VoiceExamMode";
import PracticeModal from "@/components/questions/PracticeModal";
import type { Paper, Question } from "@/types";

const PAGE_SIZE = 10;

type ExplainMode = "explain" | "hint";
type QuestionStatus = "correct" | "wrong" | "unattempted";

async function requestExplanation(payload: {
  questionId: string;
  studentAnswer?: string | null;
  mode?: ExplainMode;
}): Promise<string> {
  const res = await fetch("/api/questions/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as {
    explanation?: string;
    error?: string;
  };

  if (!res.ok || !data.explanation) {
    throw new Error(data.error ?? "Failed to load explanation.");
  }
  return data.explanation;
}

/** Records a question attempt for the signed-in student (no-op when logged out). */
async function recordAttempt(questionId: string, isCorrect: boolean | null) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("user_progress").insert({
      user_id: user.id,
      question_id: questionId,
      is_correct: isCorrect,
    });
  } catch {
    // Progress tracking is best-effort; never block the UI on it.
  }
}

/**
 * Streams an explanation from /api/questions/explain and reveals it with a
 * typewriter effect. Network chunks are buffered, then drip-fed to React state
 * a few characters at a time so the reveal feels smooth regardless of latency.
 */
function useStreamingExplanation() {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bufferRef = useRef("");
  const doneRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const start = useCallback(
    async (payload: { questionId: string; studentAnswer?: string | null }) => {
      setText("");
      setError(null);
      setStreaming(true);
      bufferRef.current = "";
      doneRef.current = false;
      clearTimer();

      intervalRef.current = setInterval(() => {
        if (bufferRef.current.length > 0) {
          const step = Math.max(2, Math.ceil(bufferRef.current.length / 40));
          setText((prev) => prev + bufferRef.current.slice(0, step));
          bufferRef.current = bufferRef.current.slice(step);
        } else if (doneRef.current) {
          clearTimer();
          setStreaming(false);
        }
      }, 16);

      try {
        const res = await fetch("/api/questions/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, mode: "explain" }),
        });

        if (!res.ok || !res.body) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Failed to load explanation.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          bufferRef.current += decoder.decode(value, { stream: true });
        }
        doneRef.current = true;
      } catch (err) {
        clearTimer();
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setStreaming(false);
      }
    },
    [clearTimer],
  );

  return { text, streaming, error, start };
}

function StudyTopicButton({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-accent-tint px-3 py-1.5 text-sm font-medium text-navy transition hover:bg-gold/10 active:scale-95"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9L12 2z" />
        </svg>
        Study this topic
      </button>
      {open && <PracticeModal questionId={questionId} onClose={() => setOpen(false)} />}
    </>
  );
}

export default function QuestionViewer({
  paper,
  context,
  initialQuestions = [],
}: {
  paper: Paper;
  context?: PaperContext;
  /** Optional first page rendered on the server; otherwise page 0 loads on mount. */
  initialQuestions?: Question[];
}) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(initialQuestions.length > 0 && initialQuestions.length < PAGE_SIZE);
  const [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, QuestionStatus>>({});
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [activeNumber, setActiveNumber] = useState<number | null>(null);

  const pageRef = useRef(initialQuestions.length > 0 ? 1 : 0);
  const loadingRef = useRef(false);
  const doneRef = useRef(initialQuestions.length > 0 && initialQuestions.length < PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || doneRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    const page = pageRef.current;
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("questions")
      .select("*")
      .eq("paper_id", paper.id)
      .order("number", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (fetchError) {
      setError(fetchError.message);
      loadingRef.current = false;
      setLoading(false);
      return;
    }

    const batch = (data ?? []) as Question[];
    setQuestions((prev) => {
      const seen = new Set(prev.map((q) => q.id));
      return [...prev, ...batch.filter((q) => !seen.has(q.id))];
    });

    pageRef.current = page + 1;
    if (batch.length < PAGE_SIZE) {
      doneRef.current = true;
      setDone(true);
    }
    loadingRef.current = false;
    setLoading(false);
  }, [paper.id]);

  // First page on mount (unless seeded by the server).
  useEffect(() => {
    if (initialQuestions.length === 0) loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadMore]);

  // Auto-load more as the sentinel scrolls into view.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleStatusChange = useCallback((id: string, status: QuestionStatus) => {
    setStatuses((prev) => (prev[id] === status ? prev : { ...prev, [id]: status }));
  }, []);

  // Track which question is most in view, to seed voice mode at the right place.
  useEffect(() => {
    const root = listRef.current;
    if (!root) return;

    const items = Array.from(
      root.querySelectorAll<HTMLElement>("[data-question-number]"),
    );
    if (items.length === 0) return;

    const ratios = new Map<number, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const n = Number((entry.target as HTMLElement).dataset.questionNumber);
          ratios.set(n, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        let best: number | null = null;
        let bestRatio = 0;
        for (const [n, r] of ratios) {
          if (r > bestRatio) {
            bestRatio = r;
            best = n;
          }
        }
        if (best !== null) setActiveNumber(best);
      },
      { threshold: [0.1, 0.5, 0.9] },
    );

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [questions.length]);

  const total = paper.total_questions > 0 ? paper.total_questions : questions.length;

  const initialLoading = questions.length === 0 && loading;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_9rem] lg:gap-8">
        <div className="min-w-0">
          <header className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            {context && (
              <nav className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>{context.level.name}</span>
                <span aria-hidden="true">→</span>
                <span className="inline-flex items-center gap-1.5">
                  <InstitutionAvatar
                    slug={context.institution.slug}
                    name={context.institution.name}
                    abbreviation={context.institution.abbreviation ?? undefined}
                    size="sm"
                  />
                  {context.institution.abbreviation ?? context.institution.name}
                </span>
                <span aria-hidden="true">→</span>
                <span>{context.subject.name}</span>
                <span aria-hidden="true">→</span>
                <span className="font-semibold text-navy">{paper.year}</span>
              </nav>
            )}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-xl font-bold tracking-tight text-navy sm:text-2xl">
                {paper.title}
              </h1>
              {paper.duration_minutes ? (
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-muted">
                  {paper.duration_minutes} min
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted">
              {total} question{total === 1 ? "" : "s"}
            </p>
          </header>

          {initialLoading ? (
            <QuestionListSkeleton />
          ) : done && questions.length === 0 ? (
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
              This paper doesn&apos;t have any questions yet.
            </p>
          ) : (
            <ol ref={listRef} className="space-y-6">
              {questions.map((question) => (
                <li
                  key={question.id}
                  id={`question-${question.number}`}
                  data-question-number={question.number}
                  className="scroll-mt-20"
                >
                  <QuestionCard
                    question={question}
                    onStatusChange={handleStatusChange}
                  />
                </li>
              ))}
            </ol>
          )}

          {/* Sentinel + load more / status footer */}
          <div ref={sentinelRef} className="mt-6">
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
                {error}{" "}
                <button
                  type="button"
                  onClick={loadMore}
                  className="font-medium underline underline-offset-2"
                >
                  Retry
                </button>
              </div>
            ) : loading && questions.length > 0 ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500">
                <Spinner />
                Loading more…
              </div>
            ) : done ? (
              questions.length > 0 && (
                <p className="py-4 text-center text-sm text-gray-400">
                  All questions loaded
                </p>
              )
            ) : (
              !initialLoading && (
                <div className="flex justify-center py-4">
                  <button
                    type="button"
                    onClick={loadMore}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Load more
                  </button>
                </div>
              )
            )}
          </div>
        </div>

        {/* Sticky navigator — desktop only */}
        <aside className="hidden lg:block">
          <QuestionNavigator
            total={total}
            questions={questions}
            statuses={statuses}
          />
        </aside>
      </div>

      {/* Floating voice-mode toggle */}
      <button
        type="button"
        onClick={() => setVoiceOpen(true)}
        disabled={questions.length === 0}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-navy px-5 py-3 text-sm font-medium text-gold shadow-lg transition active:scale-95 hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gold/50"
        aria-label="Start voice practice mode"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
        </svg>
        Voice mode
      </button>

      {voiceOpen && (
        <VoiceExamMode
          questions={questions}
          startIndex={Math.max(
            0,
            questions.findIndex((q) => q.number === activeNumber),
          )}
          onClose={() => setVoiceOpen(false)}
        />
      )}
    </div>
  );
}

function QuestionNavigator({
  total,
  questions,
  statuses,
}: {
  total: number;
  questions: Question[];
  statuses: Record<string, QuestionStatus>;
}) {
  const byNumber = useMemo(() => {
    const map = new Map<number, Question>();
    for (const q of questions) map.set(q.number, q);
    return map;
  }, [questions]);

  function scrollTo(n: number) {
    document
      .getElementById(`question-${n}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav
      aria-label="Question navigator"
      className="sticky top-20 rounded-2xl border border-border bg-card p-3 shadow-sm"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Questions
      </p>
      <ol className="grid grid-cols-4 gap-1.5">
        {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
          const question = byNumber.get(n);
          const loaded = Boolean(question);
          const status = question
            ? (statuses[question.id] ?? "unattempted")
            : "unattempted";

          const classes = !loaded
            ? "border border-dashed border-gray-200 bg-white text-gray-300 hover:border-gray-300"
            : status === "correct"
              ? "bg-green-500 text-white hover:bg-green-600"
              : status === "wrong"
                ? "bg-red-500 text-white hover:bg-red-600"
                : "border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100";

          return (
            <li key={n}>
              <button
                type="button"
                onClick={() => scrollTo(n)}
                disabled={!loaded}
                title={loaded ? `Go to question ${n}` : `Question ${n} (not loaded yet)`}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${classes} ${
                  loaded ? "cursor-pointer" : "cursor-not-allowed"
                }`}
              >
                {n}
              </button>
            </li>
          );
        })}
      </ol>

      <ul className="mt-3 space-y-1 text-[11px] text-gray-500">
        <LegendRow className="bg-green-500" label="Correct" />
        <LegendRow className="bg-red-500" label="Wrong" />
        <LegendRow className="border border-gray-200 bg-gray-50" label="Unattempted" />
      </ul>
    </nav>
  );
}

function LegendRow({ className, label }: { className: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${className}`} />
      {label}
    </li>
  );
}

function QuestionCard({
  question,
  onStatusChange,
}: {
  question: Question;
  onStatusChange: (id: string, status: QuestionStatus) => void;
}) {
  if (question.type === "mcq") {
    return <McqQuestion question={question} onStatusChange={onStatusChange} />;
  }
  return <OpenQuestion question={question} />;
}

function QuestionHeader({ question }: { question: Question }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="shrink-0 rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-navy">
          Q{question.number}
        </span>
        <p className="text-lg leading-relaxed text-text">{question.content}</p>
      </div>
      <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-muted">
        {question.type}
      </span>
    </div>
  );
}

function McqQuestion({
  question,
  onStatusChange,
}: {
  question: Question;
  onStatusChange: (id: string, status: QuestionStatus) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const explanation = useStreamingExplanation();

  const [hint, setHint] = useState<string | null>(null);
  const [hinting, setHinting] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);

  const answered = selected !== null;
  const correctKey = question.answer ?? null;
  const options = question.options ?? {};

  function handleSelect(key: string) {
    if (answered) return;
    setSelected(key);
    const correct = key === correctKey;
    onStatusChange(question.id, correct ? "correct" : "wrong");
    void recordAttempt(question.id, correct);
    explanation.start({ questionId: question.id, studentAnswer: key });
  }

  async function handleHint() {
    setHinting(true);
    setHintError(null);
    try {
      const text = await requestExplanation({
        questionId: question.id,
        mode: "hint",
      });
      setHint(text);
    } catch (err) {
      setHintError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setHinting(false);
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <QuestionHeader question={question} />

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {Object.entries(options).map(([key, value]) => {
          const isCorrect = answered && key === correctKey;
          const isWrongPick = answered && key === selected && key !== correctKey;

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSelect(key)}
              disabled={answered}
              aria-pressed={selected === key}
              className={[
                "flex items-start gap-3 rounded-xl border p-3 text-left text-sm transition-all active:scale-[0.99]",
                isCorrect
                  ? "border-success bg-success-bg text-green-900"
                  : isWrongPick
                    ? "border-red-400 bg-error-bg text-red-900"
                    : answered
                      ? "border-border bg-card text-muted"
                      : "cursor-pointer border-border bg-card text-text hover:border-gold/50 hover:shadow-sm",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                  isCorrect
                    ? "bg-success text-white"
                    : isWrongPick
                      ? "bg-red-500 text-white"
                      : "bg-surface text-muted",
                ].join(" ")}
              >
                {isCorrect ? "✓" : isWrongPick ? "✗" : key}
              </span>
              <span className="pt-0.5">{value}</span>
            </button>
          );
        })}
      </div>

      {!answered && (
        <div className="mt-4 flex flex-wrap gap-2">
          {hint ? (
            <div className="w-full rounded-xl border border-gold/30 bg-accent-tint px-4 py-3 text-sm text-navy">
              <span className="font-semibold">Hint: </span>
              {hint}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleHint}
              disabled={hinting}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text transition hover:bg-surface active:scale-95 focus:outline-none focus:ring-2 focus:ring-gold/50 disabled:opacity-60"
            >
              {hinting ? "Thinking…" : "Get Hint"}
            </button>
          )}
          {hintError && <p className="w-full text-xs text-red-600">{hintError}</p>}
        </div>
      )}

      {answered && (
        <>
          <ExplanationBlock
            streaming={explanation.streaming}
            error={explanation.error}
            text={explanation.text}
            resultLabel={
              selected === correctKey ? "Correct!" : "Not quite — here's why:"
            }
            resultTone={selected === correctKey ? "good" : "bad"}
          />
          {!explanation.error && <StudyTopicButton questionId={question.id} />}
        </>
      )}
    </article>
  );
}

function OpenQuestion({ question }: { question: Question }) {
  const [revealed, setRevealed] = useState(false);
  const explanation = useStreamingExplanation();

  function handleReveal() {
    setRevealed(true);
    void recordAttempt(question.id, null);
    explanation.start({ questionId: question.id });
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <QuestionHeader question={question} />

      {!revealed ? (
        <button
          type="button"
          onClick={handleReveal}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-navy shadow-sm transition active:scale-95 hover:bg-gold-dark focus:outline-none focus:ring-2 focus:ring-gold/50"
        >
          Check Answer
        </button>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Model answer
            </p>
            <p className="whitespace-pre-line text-sm text-gray-800">
              {question.answer?.trim()
                ? question.answer
                : "No model answer was provided for this question."}
            </p>
          </div>

          <ExplanationBlock
            streaming={explanation.streaming}
            error={explanation.error}
            text={explanation.text}
            resultLabel="AI explanation"
            resultTone="neutral"
          />
          {!explanation.error && <StudyTopicButton questionId={question.id} />}
        </div>
      )}
    </article>
  );
}

function ExplanationBlock({
  streaming,
  error,
  text,
  resultLabel,
  resultTone,
}: {
  streaming: boolean;
  error: string | null;
  text: string;
  resultLabel: string;
  resultTone: "good" | "bad" | "neutral";
}) {
  const toneClasses =
    resultTone === "good"
      ? "text-green-700"
      : resultTone === "bad"
        ? "text-red-700"
        : "text-gray-700";

  // Before any text arrives, show a subtle pulse.
  const waiting = streaming && text.length === 0;

  return (
    <div className="animate-slide-in mt-4 rounded-2xl border-l-4 border-l-gold bg-accent-tint px-4 py-4 transition-all duration-300">
      <p className={`flex items-center gap-2 text-sm font-semibold text-gold ${toneClasses}`}>
        <span aria-hidden="true">🤖</span>
        AI Explanation
      </p>
      <p className={`mt-1 text-xs font-medium ${toneClasses}`}>{resultLabel}</p>

      {error ? (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      ) : waiting ? (
        <div className="mt-2 space-y-2" aria-hidden="true">
          <div className="h-3 w-full animate-pulse rounded bg-gold/20" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-gold/20" />
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-text">
          {text}
          {streaming && <span className="blink-caret" aria-hidden="true" />}
        </p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-gray-400"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"
      />
    </svg>
  );
}

function QuestionListSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-200 p-5">
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="h-11 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
