"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BrowseHero() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed) router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <section className="relative w-full bg-navy px-4 py-14 sm:px-6 lg:px-8" style={{ minHeight: 320 }}>
      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
          Ghana&apos;s Exam Past Questions
        </h1>
        <p className="mt-3 max-w-2xl text-base text-gold sm:text-lg">
          BECE · WASSCE · University · Professional — AI-powered explanations for every answer
        </p>

        <form onSubmit={submit} className="relative mt-8 w-full max-w-xl">
          <span className="pointer-events-none absolute inset-y-0 left-5 flex items-center text-muted">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Try 'WASSCE Maths 2022' or 'photosynthesis'"
            className="w-full rounded-full border-0 bg-card py-4 pl-12 pr-5 text-base text-text shadow-lg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold/50"
          />
        </form>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {["10,000+ Questions", "20+ Years", "AI Explanations", "Free Forever"].map((pill) => (
            <span
              key={pill}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
            >
              {pill}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
