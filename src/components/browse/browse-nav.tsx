"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export type PanelItem = {
  /** Value written to the URL param (slug or id). */
  value: string;
  label: string;
  sublabel?: string;
};

/**
 * Renders a list of selectable items as client-navigated links. The active item
 * (matching the current URL param) gets a blue left-border accent. Selecting an
 * item sets `paramKey` and clears any deeper `resetKeys`.
 */
export function PanelLinkList({
  items,
  paramKey,
  resetKeys = [],
}: {
  items: PanelItem[];
  paramKey: string;
  resetKeys?: string[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get(paramKey);

  return (
    <ul className="py-1">
      {items.map((item) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set(paramKey, item.value);
        resetKeys.forEach((key) => params.delete(key));

        const isActive = active === item.value;

        return (
          <li key={item.value}>
            <Link
              href={`${pathname}?${params.toString()}`}
              aria-current={isActive ? "true" : undefined}
              className={[
                "block border-l-2 px-4 py-2.5 text-sm transition-colors",
                isActive
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-transparent text-gray-700 hover:bg-gray-50",
              ].join(" ")}
            >
              <span className="block truncate font-medium">{item.label}</span>
              {item.sublabel && (
                <span
                  className={[
                    "mt-0.5 block truncate text-xs",
                    isActive ? "text-blue-600/70" : "text-gray-400",
                  ].join(" ")}
                >
                  {item.sublabel}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** A small "back" link that removes one or more params from the current URL. */
export function BackLink({
  removeKeys,
  label,
}: {
  removeKeys: string[];
  label: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = new URLSearchParams(searchParams.toString());
  removeKeys.forEach((key) => params.delete(key));
  const query = params.toString();

  return (
    <Link
      href={query ? `${pathname}?${query}` : pathname}
      className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900"
    >
      <span aria-hidden="true">&larr;</span>
      {label}
    </Link>
  );
}
