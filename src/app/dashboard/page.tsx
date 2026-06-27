import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import QuickStart from "@/components/dashboard/QuickStart";

export const metadata = {
  title: "Dashboard — PastQ",
};

interface RecentItem {
  paper_id: string;
  paper_title: string;
  year: number;
  subject_name: string;
  answered: number;
  correct: number;
  last_attempt: string;
}

interface Recommended {
  subject_id: string;
  subject_name: string;
  subject_slug: string;
  institution_slug: string;
  institution_name: string;
  level_slug: string;
  level_name: string;
}

interface DashboardStats {
  authenticated: boolean;
  questions_attempted?: number;
  graded?: number;
  correct?: number;
  subjects_practiced?: number;
  streak?: number;
  recent?: RecentItem[];
  recommended?: Recommended | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-xl font-bold text-gray-900">Sign in to see your dashboard</h1>
        <p className="mt-2 text-sm text-gray-500">
          Track your progress, streaks and recommended subjects.
        </p>
        <Link
          href="/sign-in"
          className="mt-6 inline-block rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const { data } = await supabase.rpc("get_dashboard_stats");
  const stats = (data ?? { authenticated: true }) as DashboardStats;

  const attempted = stats.questions_attempted ?? 0;
  const graded = stats.graded ?? 0;
  const correct = stats.correct ?? 0;
  const correctPct = graded > 0 ? Math.round((correct / graded) * 100) : 0;
  const subjects = stats.subjects_practiced ?? 0;
  const streak = stats.streak ?? 0;
  const recent = stats.recent ?? [];
  const recommended = stats.recommended ?? null;

  const fullName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "there";

  const continuePaperId = recent[0]?.paper_id ?? null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 py-2">
      {/* Greeting */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 px-6 py-8 text-white">
        <p className="text-sm text-white/60">{greeting()}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome back, {capitalize(fullName)} 👋
        </h1>
        <p className="mt-1 text-sm text-white/70">
          {attempted > 0
            ? "Here's how your exam prep is going."
            : "Let's start your first practice session."}
        </p>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Questions attempted" value={attempted} accent="text-gray-900" />
        <StatCard
          label="Correct"
          value={`${correctPct}%`}
          sub={graded > 0 ? `${correct}/${graded}` : "—"}
          accent="text-green-600"
        />
        <StatCard label="Subjects practiced" value={subjects} accent="text-blue-600" />
        <StatCard
          label="Current streak"
          value={streak}
          sub={streak === 1 ? "day" : "days"}
          accent="text-orange-500"
        />
      </section>

      {/* Quick start */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Quick start</h2>
        <QuickStart continuePaperId={continuePaperId} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* Recent activity */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Recent activity</h2>
          {recent.length === 0 ? (
            <EmptyCard message="No practice yet. Answer a few questions and they'll show up here." />
          ) : (
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
              {recent.map((item) => {
                const pct =
                  item.answered > 0
                    ? Math.round((item.correct / item.answered) * 100)
                    : null;
                return (
                  <li key={item.paper_id}>
                    <Link
                      href={`/practice/${item.paper_id}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-gray-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {item.subject_name}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {item.paper_title} · {item.year}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {pct !== null ? (
                          <span
                            className={`text-sm font-semibold ${
                              pct >= 50 ? "text-green-600" : "text-red-500"
                            }`}
                          >
                            {item.correct}/{item.answered}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">viewed</span>
                        )}
                        <p className="text-[11px] text-gray-400">
                          {timeAgo(item.last_attempt)}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Recommended next */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Recommended next</h2>
          {recommended ? (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                {recommended.level_name}
              </span>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {recommended.subject_name}
              </p>
              <p className="text-sm text-gray-500">{recommended.institution_name}</p>
              <p className="mt-2 text-xs text-gray-400">
                You haven&apos;t practiced this subject yet — give it a try!
              </p>
              <Link
                href={`/browse?level=${recommended.level_slug}&institution=${recommended.institution_slug}&subject=${recommended.subject_slug}`}
                className="mt-4 inline-block rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
              >
                Start practicing
              </Link>
            </div>
          ) : (
            <EmptyCard message="You've explored every subject. Impressive!" />
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>
        {value}
        {sub && <span className="ml-1 text-sm font-medium text-gray-400">{sub}</span>}
      </p>
    </div>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
      {message}
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
