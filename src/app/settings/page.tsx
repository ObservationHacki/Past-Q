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
        <h1 className="text-xl font-bold text-gray-900">Sign in to manage settings</h1>
        <p className="mt-2 text-sm text-gray-500">
          Your account details and preferences live here.
        </p>
        <Link
          href="/sign-in?redirect=/settings"
          className="mt-6 inline-block rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700"
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
        <h1 className="text-xl font-bold tracking-tight text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your PastQ account.</p>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
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
        className="inline-block rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-50"
      >
        Back to dashboard
      </Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-4 py-3 last:border-b-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="truncate text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
