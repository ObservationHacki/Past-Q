import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import QuickStart from "@/components/dashboard/QuickStart";
import InstitutionAvatar from "@/components/ui/InstitutionAvatar";

export const metadata = {
  title: "Dashboard — PastQ",
};

interface RecentItem {
  paper_id: string;
  paper_title: string;
  year: number;
  subject_name: string;
  institution_name?: string;
  institution_slug?: string;
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
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-navy">Sign in to see your dashboard</h1>
        <p className="mt-2 text-sm text-muted">
          Track your progress, streaks and recommended subjects.
        </p>
        <Link
          href="/sign-in"
          className="mt-6 inline-block rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-navy transition active:scale-95 hover:bg-gold-dark"
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
  const initials = fullName.charAt(0).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-2xl bg-navy px-6 py-8 text-white shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/60">{greeting()}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome back, {capitalize(fullName)}
            </h1>
            <p className="mt-2 text-sm text-gold">
              {attempted > 0
                ? "Here's how your exam prep is going."
                : "Let's start your first practice session."}
            </p>
          </div>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold text-lg font-bold text-navy">
            {initials}
          </span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Questions Attempted" value={attempted} />
        <StatCard label="Correct %" value={`${correctPct}%`} sub={graded > 0 ? `${correct}/${graded}` : undefined} />
        <StatCard label="Subjects Practiced" value={subjects} />
        <StatCard label="Day Streak" value={streak} sub={streak === 1 ? "day" : "days"} accent />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold text-navy">Quick start</h2>
        <QuickStart continuePaperId={continuePaperId} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section>
          <h2 className="mb-3 text-sm font-bold text-navy">Recent activity</h2>
          {recent.length === 0 ? (
            <EmptyCard message="No practice yet. Answer a few questions and they'll show up here." />
          ) : (
            <ul className="relative space-y-0">
              <div className="absolute bottom-4 left-4 top-4 w-px bg-border" aria-hidden="true" />
              {recent.map((item) => {
                const pct =
                  item.answered > 0
                    ? Math.round((item.correct / item.answered) * 100)
                    : null;
                const slug =
                  item.institution_slug ??
                  item.institution_name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ??
                  "inst";

                return (
                  <li key={item.paper_id} className="relative pl-10">
                    <span className="absolute left-2 top-4 z-10">
                      <InstitutionAvatar
                        slug={slug}
                        name={item.institution_name ?? item.subject_name}
                        size="sm"
                      />
                    </span>
                    <Link
                      href={`/practice/${item.paper_id}`}
                      className="mb-3 block rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md"
                    >
                      <p className="font-semibold text-text">{item.subject_name}</p>
                      <p className="text-xs text-muted">
                        {item.paper_title} · {item.year}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted">
                        <span>{timeAgo(item.last_attempt)}</span>
                        {pct !== null && (
                          <span className={pct >= 50 ? "font-semibold text-success" : "font-semibold text-red-500"}>
                            {item.correct}/{item.answered}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold text-navy">What to study next</h2>
          {recommended ? (
            <div className="rounded-2xl border border-teal/30 bg-teal-tint p-5 shadow-sm">
              <span className="inline-block rounded-full bg-teal/10 px-2 py-0.5 text-[11px] font-semibold text-teal">
                {recommended.level_name}
              </span>
              <p className="mt-3 text-lg font-bold text-navy">{recommended.subject_name}</p>
              <div className="mt-2 flex items-center gap-2">
                <InstitutionAvatar
                  slug={recommended.institution_slug}
                  name={recommended.institution_name}
                  size="sm"
                />
                <p className="text-sm text-muted">{recommended.institution_name}</p>
              </div>
              <p className="mt-3 text-xs text-muted">
                You haven&apos;t practiced this subject yet — give it a try!
              </p>
              <Link
                href={`/browse?level=${recommended.level_slug}&institution=${recommended.institution_slug}&subject=${recommended.subject_slug}`}
                className="mt-4 inline-block rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-navy transition active:scale-95 hover:bg-gold-dark"
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
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ? "text-gold" : "text-navy"}`}>
        {value}
        {sub && <span className="ml-1 text-sm font-medium text-muted">{sub}</span>}
      </p>
    </div>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted">
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
