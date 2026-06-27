"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim() || undefined } },
        });
        if (signUpError) throw signUpError;
        setNotice(
          "Account created. If email confirmation is enabled, check your inbox, then sign in.",
        );
        setMode("signin");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;

      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center py-10">
      <div className="mb-6 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-navy"
        >
          <span className="inline-block h-6 w-6 rounded bg-gold" aria-hidden="true" />
          PastQ
        </Link>
        <h1 className="mt-4 text-xl font-bold text-text">
          {mode === "signin" ? "Sign in to PastQ" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "signin"
            ? "Track your progress, streaks and recommendations."
            : "Start practicing past questions in seconds."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-sm">
        {mode === "signup" && (
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            autoComplete="name"
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text placeholder:text-muted focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/50"
          />
        )}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text placeholder:text-muted focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/50"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text placeholder:text-muted focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/50"
        />

        {error && (
          <p className="rounded-lg bg-error-bg px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {notice && (
          <p className="rounded-lg bg-success-bg px-3 py-2 text-sm text-success">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition active:scale-95 hover:bg-gold-dark disabled:opacity-60 focus:ring-2 focus:ring-gold/50"
        >
          {loading
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        {mode === "signin" ? "New to PastQ?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === "signin" ? "signup" : "signin"));
            setError(null);
            setNotice(null);
          }}
          className="font-medium text-navy underline underline-offset-2 focus:ring-2 focus:ring-gold/50"
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
