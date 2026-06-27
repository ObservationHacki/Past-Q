"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const LEVEL_ICONS: Record<string, string> = {
  bece: "🎓",
  wassce: "📘",
  university: "🏛️",
  professional: "💼",
};

export function LevelCards({
  items,
}: {
  items: { slug: string; name: string; subjectCount: number }[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("level");

  return (
    <div className="grid gap-3 p-4">
      {items.map((item) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("level", item.slug);
        ["institution", "subject", "paper"].forEach((k) => params.delete(k));
        const isActive = active === item.slug;

        return (
          <Link
            key={item.slug}
            href={`${pathname}?${params.toString()}`}
            className={[
              "flex items-center gap-3 rounded-2xl border p-4 transition-all duration-200 hover:shadow-md active:scale-[0.99]",
              isActive
                ? "border-l-4 border-l-gold border-border bg-accent-tint shadow-sm"
                : "border-border bg-card hover:border-gold/30",
            ].join(" ")}
          >
            <span className="text-2xl" aria-hidden="true">
              {LEVEL_ICONS[item.slug] ?? "📚"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-text">{item.name}</p>
              <p className="text-xs text-muted">{item.subjectCount} subjects</p>
            </div>
            <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-muted">
              {item.subjectCount}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
