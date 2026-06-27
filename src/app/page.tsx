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

const LEVEL_ACCENTS: Record<string, string> = {
  bece: "from-blue-500 to-blue-600",
  wassce: "from-emerald-500 to-emerald-600",
  university: "from-purple-500 to-purple-600",
  professional: "from-orange-500 to-orange-600",
};

export default async function Home() {
  const liveLevels = await getLevels();
  const levels =
    liveLevels.length > 0
      ? liveLevels.map((l) => ({ name: l.name, slug: l.slug, description: l.description }))
      : FALLBACK_LEVELS;

  return (
    <div className="space-y-20 pb-16">
      {/* Hero */}
      <section className="pt-10 sm:pt-16">
        <div className="flex flex-col items-center text-center">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Built for Ghanaian students
          </span>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Master every past question, from BECE to Professional.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-gray-600 sm:text-lg">
            Browse real WAEC and university past papers, practice with an AI tutor that
            explains every answer, and even revise hands-free with voice mode.
          </p>

          <div className="mt-8 flex w-full flex-col items-center">
            <HeroSearch />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/browse"
              className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700"
            >
              Start browsing
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-gray-50"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Exam levels */}
      <section>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">Choose your level</h2>
            <p className="mt-1 text-sm text-gray-500">
              Jump straight into the exams that matter to you.
            </p>
          </div>
          <Link
            href="/browse"
            className="hidden text-sm font-medium text-gray-500 transition hover:text-gray-900 sm:block"
          >
            Browse all →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {levels.map((level) => (
            <Link
              key={level.slug}
              href={`/browse?level=${level.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${
                  LEVEL_ACCENTS[level.slug] ?? "from-gray-700 to-gray-900"
                } text-sm font-bold text-white`}
              >
                {level.name.slice(0, 2).toUpperCase()}
              </span>
              <h3 className="mt-4 text-base font-semibold text-gray-900">{level.name}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                {level.description ?? "Explore past papers and practice questions."}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-gray-900 opacity-0 transition group-hover:opacity-100">
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
          <h2 className="text-xl font-bold tracking-tight text-gray-900">
            Everything you need to revise smarter
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Not just a question bank — a full practice companion.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white">
                {f.icon}
              </div>
              <h3 className="mt-4 text-sm font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="rounded-3xl bg-gray-50 px-6 py-10 sm:px-10">
        <h2 className="text-center text-xl font-bold tracking-tight text-gray-900">
          How PastQ works
        </h2>
        <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                {i + 1}
              </div>
              <h3 className="mt-4 text-sm font-semibold text-gray-900">{step.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 to-gray-700 px-6 py-12 text-center text-white sm:px-12">
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
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
          >
            Create free account
          </Link>
          <Link
            href="/browse"
            className="rounded-lg border border-white/30 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
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
