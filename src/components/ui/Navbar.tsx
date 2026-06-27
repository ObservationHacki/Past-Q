"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close the avatar dropdown when clicking outside of it.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    setMobileOpen(false);
  }

  const initials = getInitials(user);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo / wordmark */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1 text-xl font-bold tracking-tight text-gray-900"
        >
          Past
          <span className="rounded-md bg-gray-900 px-1.5 py-0.5 text-white">Q</span>
        </Link>

        {/* Search bar — center, desktop only */}
        <div className="hidden flex-1 justify-center px-4 md:flex">
          <SearchInput className="w-full max-w-md" />
        </div>

        {/* Right side — desktop */}
        <div className="ml-auto hidden items-center gap-3 md:flex">
          {loading ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-gray-100" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-sm font-medium text-white transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Account menu"
              >
                {initials}
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                >
                  <div className="border-b border-gray-100 px-4 py-2">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {user.user_metadata?.full_name ?? "Signed in"}
                    </p>
                    <p className="truncate text-xs text-gray-500">{user.email}</p>
                  </div>
                  <Link
                    href="/dashboard"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/settings"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/sign-in"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
            >
              Sign in
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-900 hover:bg-gray-100 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </nav>

      {/* Mobile panel */}
      {mobileOpen && (
        <div className="border-t border-gray-200 bg-white px-4 py-4 md:hidden">
          <SearchInput className="w-full" />
          <div className="mt-4">
            {loading ? (
              <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100" />
            ) : user ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3 px-1 py-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-sm font-medium text-white">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {user.user_metadata?.full_name ?? "Signed in"}
                    </p>
                    <p className="truncate text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-1 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Dashboard
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-1 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-lg px-1 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/sign-in"
                onClick={() => setMobileOpen(false)}
                className="block w-full rounded-lg bg-gray-900 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-gray-700"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function SearchInput({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
        <SearchIcon />
      </span>
      <input
        type="search"
        placeholder="Search past questions, subjects, papers…"
        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-900"
      />
    </div>
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
    <svg
      width="16"
      height="16"
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
  );
}

function MenuIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
