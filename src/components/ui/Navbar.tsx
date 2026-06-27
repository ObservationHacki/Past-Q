"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    setMobileOpen(false);
  }

  const initials = getInitials(user);

  return (
    <header
      className={[
        "sticky top-0 z-50 w-full transition-all duration-200",
        scrolled
          ? "border-b border-border/80 bg-card/80 shadow-sm backdrop-blur-md"
          : "border-b border-transparent bg-card",
      ].join(" ")}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gold text-xs font-black text-navy">
            Q
          </span>
          <span className="text-xl font-bold tracking-tight text-navy">PastQ</span>
        </Link>

        <div className="hidden flex-1 justify-center px-4 md:flex">
          <SearchInput inputRef={searchRef} className="w-full max-w-lg" />
        </div>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <Link
            href="/browse"
            className="text-sm font-medium text-muted transition hover:text-navy"
          >
            Browse
          </Link>
          {loading ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-border" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-sm font-semibold text-gold transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-gold/50"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Account menu"
              >
                {initials}
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
                >
                  <div className="border-b border-border px-4 py-2">
                    <p className="truncate text-sm font-medium text-text">
                      {user.user_metadata?.full_name ?? "Signed in"}
                    </p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                  <Link
                    href="/dashboard"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-text hover:bg-surface"
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    className="block w-full px-4 py-2 text-left text-sm text-text hover:bg-surface"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/sign-in"
              className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-navy transition active:scale-95 hover:bg-gold-dark focus:outline-none focus:ring-2 focus:ring-gold/50"
            >
              Sign In
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy hover:bg-surface md:hidden"
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-t border-border bg-card px-4 py-4 md:hidden">
          <SearchInput
            inputRef={searchRef}
            className="w-full"
            onNavigate={() => setMobileOpen(false)}
          />
          <div className="mt-4 flex flex-col gap-1">
            <Link
              href="/browse"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-2 py-2 text-sm font-medium text-text hover:bg-surface"
            >
              Browse
            </Link>
            {loading ? (
              <div className="mt-2 h-10 animate-pulse rounded-lg bg-border" />
            ) : user ? (
              <>
                <div className="flex items-center gap-3 px-2 py-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-sm font-semibold text-gold">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">
                      {user.user_metadata?.full_name ?? "Signed in"}
                    </p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-2 py-2 text-sm text-text hover:bg-surface"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-lg px-2 py-2 text-left text-sm text-text hover:bg-surface"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/sign-in"
                onClick={() => setMobileOpen(false)}
                className="mt-2 block rounded-full bg-gold px-4 py-2.5 text-center text-sm font-semibold text-navy"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function SearchInput({
  className = "",
  inputRef,
  onNavigate,
}: {
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(() => searchParams.get("q") ?? "");

  useEffect(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const timer = setTimeout(() => {
      router.replace(`/search?q=${encodeURIComponent(trimmed)}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [value, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    onNavigate?.();
  }

  return (
    <form onSubmit={handleSubmit} role="search" className={`relative ${className}`}>
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted">
        <SearchIcon />
      </span>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search past questions..."
        className="w-full rounded-full border border-border bg-surface py-2.5 pl-11 pr-14 text-sm text-text shadow-sm placeholder:text-muted focus:border-gold focus:bg-card focus:outline-none focus:ring-2 focus:ring-gold/30"
      />
      <kbd className="pointer-events-none absolute inset-y-0 right-3 hidden items-center rounded-md border border-border bg-card px-1.5 text-[10px] font-medium text-muted sm:flex">
        ⌘K
      </kbd>
    </form>
  );
}

function getInitials(user: User | null): string {
  if (!user) return "?";
  const name = (user.user_metadata?.full_name as string | undefined)?.trim();
  if (name) {
    const parts = name.split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return (user.email?.[0] ?? "?").toUpperCase();
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
