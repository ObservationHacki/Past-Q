"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function QuickStart({
  continuePaperId,
}: {
  continuePaperId: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleContinue() {
    if (continuePaperId) router.push(`/practice/${continuePaperId}`);
  }

  async function handleRandom() {
    setLoading(true);
    try {
      const res = await fetch("/api/random-paper");
      const data = (await res.json()) as { paperId: string | null };
      if (data.paperId) router.push(`/practice/${data.paperId}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        onClick={handleContinue}
        disabled={!continuePaperId}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        {continuePaperId ? "Continue where I left off" : "Nothing to continue yet"}
      </button>

      <button
        type="button"
        onClick={handleRandom}
        disabled={loading}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-800 transition hover:bg-gray-50 disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M16 3h5v5" />
          <path d="M4 20 21 3" />
          <path d="M21 16v5h-5" />
          <path d="M15 15l6 6" />
          <path d="M4 4l5 5" />
        </svg>
        {loading ? "Finding…" : "Random question"}
      </button>
    </div>
  );
}
