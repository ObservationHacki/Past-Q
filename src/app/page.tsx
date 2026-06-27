import Link from "next/link";
import { getLevels } from "@/lib/browse-data";
import HeroSearch from "@/components/home/HeroSearch";
import type { Level } from "@/types";

const FALLBACK_LEVELS: Pick<Level, "name" | "slug" | "description">[] = [
  { name: "BECE", slug: "bece", description: "Basic Education Certificate Examination" },
  { name: "WASSCE", slug: "wassce", description: "West African Senior School Certificate" },
  { name: "University", slug: "university", description: "Tertiary & degree-level past papers" },
  { name: "Professional", slug: "professional", description: "ICAG, GIT, licensure & more" },
];

const LEVEL_ICONS: Record<string, string> = {
  bece: "🎓",
  wassce: "📘",
  university: "🏛️",
  professional: "💼",
};

export default async function Home() {
  const liveLevels = await getLevels();
  const levels =
    liveLevels.length > 0
      ? liveLevels.map((l) => ({ name: l.name, slug: l.slug, description: l.description }))
      : FALLBACK_LEVELS;

  return (
    <div className="mx-auto max-w-7xl space-y-20 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl bg-navy px-6 py-14 text-center sm:px-12 sm:py-16">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          Built for Ghanaian students
        </span>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Ghana&apos;s Exam Past Questions
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-gold sm:text-lg">
          BECE · WASSCE · University · Professional — AI-powered explanations for every answer
        </p>

        <div className="mt-8 flex w-full flex-col items-center">
          <HeroSearch />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {["10,000+ Questions", "20+ Years", "AI Explanations", "Free Forever"].map((stat) => (
            <span
              key={stat}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90"
            >
              {stat}
            </span>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/browse"
            className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-navy shadow-sm transition active:scale-95 hover:bg-gold-dark focus:ring-2 focus:ring-gold/50"
          >
            Start browsing
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-white/30 px-5 py-2.5 text-sm font-medium text-white transition active:scale-95 hover:bg-white/10 focus:ring-2 focus:ring-gold/50"
          >
            Go to dashboard
          </Link>
        </div>
      </section>

      {/* Exam levels */}
      <section>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-text">Choose your level</h2>
            <p className="mt-1 text-sm text-muted">
              Jump straight into the exams that matter to you.
            </p>
          </div>
          <Link
            href="/browse"
            className="hidden text-sm font-medium text-muted transition hover:text-text sm:block"
          >
            Browse all →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {levels.map((level) => (
            <Link
              key={level.slug}
              href={`/browse?level=${level.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md active:scale-[0.99]"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-tint text-xl">
                {LEVEL_ICONS[level.slug] ?? "📚"}
              </span>
              <h3 className="mt-4 text-base font-semibold text-text">{level.name}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted">
                {level.description ?? "Explore past papers and practice questions."}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-gold opacity-0 transition group-hover:opacity-100">
                Explore
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section>
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight text-text">
            Everything you need to revise smarter
          </h2>
          <p className="mt-1 text-sm text-muted">
            Not just a question bank — a full practice companion.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-gold">
                {f.icon}
              </div>
              <h3 className="mt-4 text-sm font-semibold text-text">{f.title}</h3>
              <p className="mt-1 text-sm text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="rounded-3xl bg-surface px-6 py-10 sm:px-10">
        <h2 className="text-center text-xl font-bold tracking-tight text-text">
          How PastQ works
        </h2>
        <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gold text-sm font-bold text-navy">
                {i + 1}
              </div>
              <h3 className="mt-4 text-sm font-semibold text-text">{step.title}</h3>
              <p className="mt-1 text-sm text-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="overflow-hidden rounded-3xl bg-navy px-6 py-12 text-center text-white sm:px-12">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Ready to ace your next exam?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/70">
          Create a free account to track your progress, build streaks and get
          personalised subject recommendations.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/sign-in"
            className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-navy shadow-sm transition active:scale-95 hover:bg-gold-dark focus:ring-2 focus:ring-gold/50"
          >
            Create free account
          </Link>
          <Link
            href="/browse"
            className="rounded-lg border border-white/30 px-5 py-2.5 text-sm font-medium text-white transition active:scale-95 hover:bg-white/10 focus:ring-2 focus:ring-gold/50"
          >
            Browse questions
          </Link>
        </div>
      </section>
    </div>
  );
}

const FEATURES: { title: string; body: string; icon: React.ReactNode }[] = [
  {
    title: "Real past papers",
    body: "BECE, WASSCE, university and professional questions organised by year.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </svg>
    ),
  },
  {
    title: "AI tutor explanations",
    body: "Get an instant, step-by-step explanation tailored to the Ghana curriculum.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9L12 2z" />
      </svg>
    ),
  },
  {
    title: "Voice practice mode",
    body: "Read a question aloud, speak your answer and get spoken feedback.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
      </svg>
    ),
  },
  {
    title: "Track your progress",
    body: "See questions attempted, accuracy, subjects covered and your daily streak.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
  },
];

const STEPS: { title: string; body: string }[] = [
  { title: "Pick a paper", body: "Browse by level, institution and subject to find a past paper." },
  { title: "Practice & learn", body: "Answer questions and get AI explanations the moment you respond." },
  { title: "Track progress", body: "Your attempts feed a dashboard so you always know what to revise next." },
];
