"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Question } from "@/types";

type Status =
  | "idle"
  | "starting"
  | "reading"
  | "ready"
  | "recording"
  | "transcribing"
  | "evaluating"
  | "speaking";

type Bubble = {
  id: string;
  role: "question" | "student" | "feedback";
  text: string;
};

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const STATUS_LABEL: Record<Status, string> = {
  idle: "Tap start to begin",
  starting: "Requesting microphone…",
  reading: "Reading the question…",
  ready: "Your turn — record your answer",
  recording: "Listening…",
  transcribing: "Transcribing your answer…",
  evaluating: "Evaluating…",
  speaking: "Giving feedback…",
};

export default function VoiceExamMode({
  questions,
  startIndex = 0,
  onClose,
}: {
  questions: Question[];
  startIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(
    Math.min(Math.max(0, startIndex), Math.max(0, questions.length - 1)),
  );
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const question = questions[index];

  const addBubble = useCallback((role: Bubble["role"], text: string) => {
    setBubbles((prev) => [
      ...prev,
      { id: `${role}-${Date.now()}-${Math.random()}`, role, text },
    ]);
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const speak = useCallback(
    async (text: string) => {
      stopAudio();
      const res = await fetch("/api/voice?action=tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Could not play audio.");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      await new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.play().catch(() => resolve());
      });
    },
    [stopAudio],
  );

  const readQuestion = useCallback(async () => {
    if (!question) return;
    setError(null);
    setBubbles([{ id: `q-${question.id}`, role: "question", text: question.content }]);
    setStatus("reading");
    try {
      await speak(buildQuestionSpeech(question));
    } catch {
      // Reading is best-effort; continue even if TTS fails.
    }
    setStatus("ready");
  }, [question, speak]);

  // Read the question whenever practice starts or the question changes.
  useEffect(() => {
    if (started) readQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, index]);

  // Clean up media + audio on unmount.
  useEffect(() => {
    return () => {
      stopAudio();
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [stopAudio]);

  async function handleStart() {
    setError(null);
    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setStarted(true);
    } catch {
      setError("Microphone access was denied. Please allow it and try again.");
      setStatus("idle");
    }
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;

    stopAudio();
    chunksRef.current = [];

    const mimeType =
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : undefined;

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = handleRecordingStop;
    recorderRef.current = recorder;
    recorder.start();
    setStatus("recording");
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  async function handleRecordingStop() {
    const blob = new Blob(chunksRef.current, {
      type: recorderRef.current?.mimeType || "audio/webm",
    });

    setStatus("transcribing");
    try {
      const transcript = await transcribe(blob);
      if (!transcript.trim()) {
        setError("I couldn't hear an answer. Please try recording again.");
        setStatus("ready");
        return;
      }
      addBubble("student", transcript);

      setStatus("evaluating");
      const feedback = await evaluate(question, transcript);
      addBubble("feedback", feedback);

      setStatus("speaking");
      try {
        await speak(feedback);
      } catch {
        // Feedback text is already shown; ignore TTS failure.
      }
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("ready");
    }
  }

  function goTo(next: number) {
    stopAudio();
    setStatus("ready");
    setIndex(next);
  }

  const busy =
    status === "transcribing" || status === "evaluating" || status === "speaking";
  const recordDisabled = !started || status === "reading" || busy;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="flex h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:h-[80vh] sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Voice practice</p>
            <p className="text-xs text-gray-500">
              Question {question ? index + 1 : 0} of {questions.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close voice practice"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Conversation */}
        <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 px-4 py-4">
          {!started ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-white">
                <MicIcon />
              </div>
              <p className="text-sm font-medium text-gray-900">Voice exam practice</p>
              <p className="mt-1 max-w-xs text-xs text-gray-500">
                The examiner will read each question aloud. Speak your answer and get
                instant spoken feedback.
              </p>
            </div>
          ) : (
            bubbles.map((b) => <BubbleView key={b.id} bubble={b} />)
          )}
        </div>

        {/* Status + error */}
        <div className="border-t border-gray-200 px-4 pt-3">
          {error ? (
            <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          ) : (
            <p className="mb-2 flex items-center gap-2 text-xs text-gray-500">
              {(status === "reading" || busy) && <Dot pulse />}
              {status === "recording" && <Dot pulse className="bg-red-500" />}
              {STATUS_LABEL[status]}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 px-4 pb-4">
          {!started ? (
            <button
              type="button"
              onClick={handleStart}
              disabled={status === "starting" || questions.length === 0}
              className="flex-1 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-60"
            >
              {status === "starting" ? "Starting…" : "Start voice practice"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => goTo(Math.max(0, index - 1))}
                disabled={index === 0 || busy}
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                aria-label="Previous question"
              >
                Prev
              </button>

              <button
                type="button"
                onClick={() =>
                  status === "recording" ? stopRecording() : startRecording()
                }
                disabled={recordDisabled}
                className={[
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition disabled:opacity-50",
                  status === "recording"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700",
                ].join(" ")}
              >
                <MicIcon small />
                {status === "recording" ? "Stop & submit" : "Record answer"}
              </button>

              <button
                type="button"
                onClick={() => readQuestion()}
                disabled={busy || status === "recording"}
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                aria-label="Repeat question"
              >
                Repeat
              </button>

              <button
                type="button"
                onClick={() => goTo(Math.min(questions.length - 1, index + 1))}
                disabled={index >= questions.length - 1 || busy}
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                aria-label="Next question"
              >
                Next
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BubbleView({ bubble }: { bubble: Bubble }) {
  if (bubble.role === "student") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-gray-900 px-3 py-2 text-sm text-white">
          {bubble.text}
        </div>
      </div>
    );
  }

  const isFeedback = bubble.role === "feedback";
  return (
    <div className="flex justify-start">
      <div
        className={[
          "max-w-[85%] rounded-2xl rounded-bl-sm px-3 py-2 text-sm",
          isFeedback
            ? "bg-blue-50 text-blue-900"
            : "border border-gray-200 bg-white text-gray-800",
        ].join(" ")}
      >
        {!isFeedback && (
          <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Examiner
          </span>
        )}
        {bubble.text}
      </div>
    </div>
  );
}

function Dot({ pulse, className = "bg-gray-400" }: { pulse?: boolean; className?: string }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${className} ${pulse ? "animate-pulse" : ""}`}
    />
  );
}

function MicIcon({ small }: { small?: boolean }) {
  const size = small ? 16 : 24;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
    </svg>
  );
}

function buildQuestionSpeech(question: Question): string {
  if (question.type === "mcq" && question.options) {
    const options = Object.entries(question.options)
      .map(([key, value]) => `${key}. ${value}`)
      .join(". ");
    return `Question ${question.number}. ${question.content}. Your options are: ${options}. Say A, B, C, or D.`;
  }

  const marks = question.marks
    ? ` This question is worth ${question.marks} mark${question.marks === 1 ? "" : "s"}.`
    : "";
  return `Question ${question.number}. ${question.content}.${marks} Speak your answer when you are ready.`;
}

function buildEvalMessages(question: Question, transcript: string): ChatMessage[] {
  const system =
    "You are a friendly oral examiner for Ghanaian BECE and WASSCE students. " +
    "Keep spoken feedback concise (2 to 4 sentences), warm and encouraging, and in plain prose without markdown.";

  let user: string;
  if (question.type === "mcq" && question.options) {
    const options = Object.entries(question.options)
      .map(([key, value]) => `${key}) ${value}`)
      .join("\n");
    user =
      `Multiple choice question: ${question.content}\n` +
      `Options:\n${options}\n` +
      `Correct option: ${question.answer ?? "unknown"}\n` +
      `The student said aloud: "${transcript}"\n` +
      `Work out which option they chose (they may say just the letter or the option text). ` +
      `Tell them clearly whether they are right. If wrong, give the correct option and a one-line reason.`;
  } else {
    user =
      `${question.type} question worth ${question.marks} marks: ${question.content}\n` +
      `Model answer: ${question.answer ?? "not provided"}\n` +
      `Marking notes: ${question.explanation ?? "none"}\n` +
      `The student answered aloud: "${transcript}"\n` +
      `Evaluate their answer, give an approximate score out of ${question.marks}, and offer one concrete tip to improve.`;
  }

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

async function transcribe(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, "answer.webm");

  const res = await fetch("/api/voice?action=stt", { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Could not transcribe your answer.");
  return data.text ?? "";
}

async function evaluate(question: Question, transcript: string): Promise<string> {
  const res = await fetch("/api/voice?action=chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: buildEvalMessages(question, transcript) }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    content?: string;
    error?: string;
  };
  if (!res.ok || !data.content) {
    throw new Error(data.error ?? "Could not evaluate your answer.");
  }
  return data.content;
}
