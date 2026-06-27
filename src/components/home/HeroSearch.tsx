"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const SUGGESTIONS = ["WASSCE Maths 2022", "Photosynthesis", "Quadratic equations", "Osmosis"];

export default function HeroSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function go(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    go(value);
  }

  return (
    <div className="w-full max-w-xl">
      <form onSubmit={handleSubmit} role="search" className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Try 'WASSCE Maths 2022' or 'photosynthesis'"
          className="w-full rounded-full border-0 bg-white py-3.5 pl-12 pr-28 text-sm text-text shadow-lg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold/50"
        />
        <button
          type="submit"
          className="absolute inset-y-1.5 right-1.5 rounded-full bg-gold px-4 text-sm font-semibold text-navy transition active:scale-95 hover:bg-gold-dark focus:ring-2 focus:ring-gold/50"
        >
          Search
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-white/70">
        <span>Try:</span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => go(s)}
            className="rounded-full border border-white/20 bg-white/10 px-3 py-1 font-medium text-white/90 transition hover:bg-white/20 focus:ring-2 focus:ring-gold/50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
