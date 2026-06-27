import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Settings — PastQ",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-xl font-bold text-text">Sign in to manage settings</h1>
        <p className="mt-2 text-sm text-muted">
          Your account details and preferences live here.
        </p>
        <Link
          href="/sign-in?redirect=/settings"
          className="mt-6 inline-block rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-navy shadow-sm transition active:scale-95 hover:bg-gold-dark focus:ring-2 focus:ring-gold/50"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const fullName = (user.user_metadata?.full_name as string | undefined)?.trim() || "—";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 py-2">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text">Settings</h1>
        <p className="text-sm text-muted">Manage your PastQ account.</p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <Row label="Full name" value={fullName} />
        <Row label="Email" value={user.email ?? "—"} />
        <Row
          label="Member since"
          value={new Date(user.created_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        />
      </section>

      <Link
        href="/dashboard"
        className="inline-block rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text transition hover:bg-surface active:scale-95 focus:ring-2 focus:ring-gold/50"
      >
        Back to dashboard
      </Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-b-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="truncate text-sm font-medium text-text">{value}</span>
    </div>
  );
}
