"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SearchResult } from "@/app/api/search/route";
import InstitutionAvatar from "@/components/ui/InstitutionAvatar";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";

interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function institutionSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function SearchResults({
  query,
  filters = {},
}: {
  query: string;
  filters?: Record<string, string>;
}) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    setPage(1);
  }, [query, filterKey]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setData(null);
      return;
    }

    const params = new URLSearchParams({ q: trimmed, page: String(page) });
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/search?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Search failed.");
        return json as SearchResponse;
      })
      .then((json) => setData(json))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Search failed.");
        setData(null);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [query, filterKey, page]);

  const terms = useMemo(() => tokenize(query), [query]);
  const groups = useMemo(() => groupByInstitution(data?.results ?? []), [data]);

  if (!query.trim()) {
    return (
      <EmptyState
        icon="🔍"
        title="Search past questions"
        message="Type a topic, subject, or keyword to find questions across BECE, WASSCE, and more."
      />
    );
  }

  if (loading && !data) {
    return <ResultsSkeleton />;
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-red-200 bg-error-bg px-4 py-6 text-center text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (data && data.total === 0) {
    return (
      <EmptyState
        title="No results found"
        message={`We couldn't find questions matching "${query.trim()}". Try a different keyword.`}
      />
    );
  }

  return (
    <div className={loading ? "opacity-60 transition-opacity" : ""}>
      <p className="mb-4 text-sm text-muted">
        {data?.total} result{data?.total === 1 ? "" : "s"} for{" "}
        <span className="font-semibold text-navy">&ldquo;{query.trim()}&rdquo;</span>
      </p>

      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.institutionId}>
            <div className="sticky top-16 z-10 -mx-1 mb-3 flex items-center gap-2 rounded-xl border border-border bg-card/95 px-3 py-2 backdrop-blur-sm">
              <InstitutionAvatar
                slug={group.institutionSlug}
                name={group.institutionName}
                size="sm"
              />
              <h2 className="text-sm font-bold text-navy">{group.institutionName}</h2>
              <span className="ml-auto text-xs text-muted">{group.items.length}</span>
            </div>

            <ul className="space-y-3">
              {group.items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/practice/${item.paper_id}#question-${item.number}`}
                    className="block rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md active:scale-[0.99]"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-text">{item.subject_name}</span>
                      <span className="rounded-full bg-surface px-2 py-0.5 font-medium text-muted">
                        {item.year}
                      </span>
                      <span className="rounded-full bg-accent-tint px-2 py-0.5 font-medium uppercase text-navy">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-text">
                      <span className="font-bold text-muted">Q{item.number}. </span>
                      <Highlight text={buildSnippet(item.content, terms)} terms={terms} />
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text transition hover:bg-surface active:scale-95 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-muted">
            Page {data.page} of {data.totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages || loading}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text transition hover:bg-surface active:scale-95 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function groupByInstitution(results: SearchResult[]) {
  const map = new Map<
    string,
    {
      institutionId: string;
      institutionName: string;
      institutionSlug: string;
      items: SearchResult[];
    }
  >();

  for (const result of results) {
    const existing = map.get(result.institution_id);
    if (existing) {
      existing.items.push(result);
    } else {
      map.set(result.institution_id, {
        institutionId: result.institution_id,
        institutionName: result.institution_name,
        institutionSlug: institutionSlug(result.institution_name),
        items: [result],
      });
    }
  }

  return Array.from(map.values());
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
}

function buildSnippet(content: string, terms: string[]): string {
  if (terms.length === 0 || content.length <= 200) return content;

  const lower = content.toLowerCase();
  let first = -1;
  for (const term of terms) {
    const idx = lower.indexOf(term);
    if (idx >= 0 && (first === -1 || idx < first)) first = idx;
  }
  if (first === -1) return content.slice(0, 200) + "…";

  const start = Math.max(0, first - 60);
  const end = Math.min(content.length, first + 140);
  return (
    (start > 0 ? "…" : "") +
    content.slice(start, end) +
    (end < content.length ? "…" : "")
  );
}

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0) return <>{text}</>;

  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const termSet = new Set(terms);
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        part && termSet.has(part.toLowerCase()) ? (
          <mark key={i} className="rounded bg-gold/30 px-0.5 font-medium text-navy">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4">
          <Skeleton className="mb-3 h-3 w-40" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}
