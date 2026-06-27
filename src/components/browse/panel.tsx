import type { ReactNode } from "react";

/** A single scrollable explorer column with a sticky header. */
export function Panel({
  title,
  action,
  children,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex h-[70vh] min-w-0 flex-col bg-white">
      <header className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {title}
        </h2>
        {action}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  );
}

/** Skeleton placeholder rows shown while a panel's data is loading. */
export function ListSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <ul className="space-y-1 p-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="rounded-md px-1 py-2">
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-2.5 w-1/2 animate-pulse rounded bg-gray-100" />
        </li>
      ))}
    </ul>
  );
}

/** Friendly empty / placeholder message for a panel. */
export function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-7L9 4H5a2 2 0 0 0-2 2Z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      <p className="mt-1 max-w-[18rem] text-xs text-gray-400">{message}</p>
    </div>
  );
}
