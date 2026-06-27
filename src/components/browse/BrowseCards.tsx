"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import InstitutionAvatar from "@/components/ui/InstitutionAvatar";

export function InstitutionGrid({
  items,
}: {
  items: {
    slug: string;
    name: string;
    abbreviation?: string | null;
  }[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("institution");

  return (
    <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
      {items.map((item) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("institution", item.slug);
        ["subject", "paper"].forEach((k) => params.delete(k));
        const isActive = active === item.slug;

        return (
          <Link
            key={item.slug}
            href={`${pathname}?${params.toString()}`}
            className={[
              "flex flex-col items-center rounded-2xl border p-4 text-center transition-all duration-200 hover:shadow-md active:scale-[0.99]",
              isActive
                ? "border-gold bg-accent-tint shadow-sm ring-1 ring-gold/30"
                : "border-border bg-card hover:border-gold/30",
            ].join(" ")}
          >
            <InstitutionAvatar
              slug={item.slug}
              name={item.name}
              abbreviation={item.abbreviation ?? undefined}
              size="md"
            />
            <p className="mt-3 line-clamp-2 text-sm font-bold text-text">{item.name}</p>
            {item.abbreviation && (
              <p className="mt-0.5 text-xs text-muted">{item.abbreviation}</p>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export function SubjectList({
  items,
}: {
  items: { slug: string; name: string; description?: string | null }[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("subject");

  return (
    <ul className="divide-y divide-border p-2">
      {items.map((item) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("subject", item.slug);
        params.delete("paper");
        const isActive = active === item.slug;

        return (
          <li key={item.slug}>
            <Link
              href={`${pathname}?${params.toString()}`}
              className={[
                "flex items-center justify-between rounded-xl px-3 py-3 transition hover:bg-surface",
                isActive ? "bg-accent-tint font-semibold text-navy" : "text-text",
              ].join(" ")}
            >
              <span className="text-sm">{item.name}</span>
              <Chevron />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function PaperCards({
  items,
}: {
  items: {
    id: string;
    title: string;
    year: number;
    total_questions: number;
    duration_minutes: number | null;
  }[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="space-y-3 p-4">
      {items.map((paper) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("paper", paper.id);

        return (
          <div
            key={paper.id}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-3xl font-bold text-navy">{paper.year}</p>
                <p className="mt-1 text-sm font-medium text-text">{paper.title}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">
                  {paper.total_questions} Qs
                </span>
                {paper.duration_minutes ? (
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">
                    {paper.duration_minutes} min
                  </span>
                ) : null}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link
                href={`/practice/${paper.id}`}
                className="inline-flex flex-1 items-center justify-center rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-navy shadow-sm transition active:scale-95 hover:bg-gold-dark focus:outline-none focus:ring-2 focus:ring-gold/50"
              >
                Start Practice
              </Link>
              <Link
                href={`${pathname}?${params.toString()}`}
                className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:bg-surface"
              >
                Preview
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
