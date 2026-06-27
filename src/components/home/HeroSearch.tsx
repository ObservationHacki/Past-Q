"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const SUGGESTIONS = ["Photosynthesis", "Quadratic equations", "Osmosis", "Comprehension"];

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
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-400">
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
          placeholder="Search a topic, e.g. “photosynthesis”"
          className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-12 pr-28 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
        <button
          type="submit"
          className="absolute inset-y-1.5 right-1.5 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white transition hover:bg-gray-700"
        >
          Search
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span>Try:</span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => go(s)}
            className="rounded-full border border-gray-200 bg-white px-3 py-1 font-medium text-gray-600 transition hover:border-gray-900 hover:text-gray-900"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
