"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SearchResult } from "@/app/api/search/route";

interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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

  // Stable key so the fetch effect re-runs when query or filters change.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filterKey, page]);

  const terms = useMemo(() => tokenize(query), [query]);

  const groups = useMemo(() => groupBySubject(data?.results ?? []), [data]);

  if (!query.trim()) {
    return (
      <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
        Type a search term to find past questions.
      </p>
    );
  }

  if (loading && !data) {
    return <ResultsSkeleton />;
  }

  if (error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (data && data.total === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-12 text-center">
        <p className="text-sm font-medium text-gray-900">No results found</p>
        <p className="mt-1 text-sm text-gray-500">
          We couldn&apos;t find any questions matching{" "}
          <span className="font-medium text-gray-700">
            &ldquo;{query.trim()}&rdquo;
          </span>
          . Try a different keyword.
        </p>
      </div>
    );
  }

  return (
    <div className={loading ? "opacity-60 transition-opacity" : ""}>
      <p className="mb-4 text-sm text-gray-500">
        {data?.total} result{data?.total === 1 ? "" : "s"} for{" "}
        <span className="font-medium text-gray-900">
          &ldquo;{query.trim()}&rdquo;
        </span>
      </p>

      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.subjectId}>
            <h2 className="mb-2 border-b border-gray-100 pb-1 text-sm font-semibold text-gray-900">
              {group.subjectName}
              <span className="ml-2 font-normal text-gray-400">
                {group.items.length}
              </span>
            </h2>

            <ul className="divide-y divide-gray-100">
              {group.items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/browse?paper=${item.paper_id}#q-${item.id}`}
                    className="block rounded-lg px-2 py-3 transition-colors hover:bg-gray-50"
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                      <span className="font-medium text-gray-700">
                        {item.institution_name}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{item.year}</span>
                      <span aria-hidden="true">·</span>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 uppercase tracking-wide">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-700">
                      <span className="font-medium text-gray-400">
                        Q{item.number}.{" "}
                      </span>
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
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {data.page} of {data.totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages || loading}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function groupBySubject(results: SearchResult[]) {
  const map = new Map<
    string,
    { subjectId: string; subjectName: string; items: SearchResult[] }
  >();

  for (const result of results) {
    const existing = map.get(result.subject_id);
    if (existing) {
      existing.items.push(result);
    } else {
      map.set(result.subject_id, {
        subjectId: result.subject_id,
        subjectName: result.subject_name,
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

/** Builds a ~200-char snippet centred on the first matching term. */
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
          <mark key={i} className="rounded bg-yellow-200 px-0.5 text-gray-900">
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
    <div className="space-y-6" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-gray-100 p-3">
          <div className="h-2.5 w-40 animate-pulse rounded bg-gray-100" />
          <div className="mt-3 h-3.5 w-full animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-3.5 w-4/5 animate-pulse rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
