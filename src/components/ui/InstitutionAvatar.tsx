"use client";

import Image from "next/image";
import { useState } from "react";

const AVATAR_PALETTES = [
  { bg: "#0D1B2A", text: "#F4A31B" },
  { bg: "#0D9488", text: "#FFFFFF" },
  { bg: "#1E293B", text: "#F4A31B" },
  { bg: "#334155", text: "#FDE68A" },
  { bg: "#0F766E", text: "#FFFFFF" },
] as const;

function paletteForSlug(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash + slug.charCodeAt(i) * 17) % 9973;
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
}

function initials(abbreviation?: string, name?: string): string {
  const abbr = abbreviation?.trim();
  if (abbr) return abbr.slice(0, 3).toUpperCase();
  const parts = (name ?? "").split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name ?? "?").slice(0, 3).toUpperCase();
}

const SIZES = {
  sm: { px: 32, text: "text-[10px]" },
  md: { px: 48, text: "text-xs" },
  lg: { px: 64, text: "text-sm" },
} as const;

export default function InstitutionAvatar({
  slug,
  name,
  abbreviation,
  size = "md",
}: {
  slug: string;
  name: string;
  abbreviation?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const dim = SIZES[size];
  const palette = paletteForSlug(slug);
  const label = initials(abbreviation, name);

  if (!imgFailed) {
    return (
      <Image
        src={`/logos/${slug}.png`}
        alt={`${name} logo`}
        width={dim.px}
        height={dim.px}
        className="shrink-0 rounded-full object-cover ring-1 ring-border"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ring-1 ring-border ${dim.text}`}
      style={{
        width: dim.px,
        height: dim.px,
        backgroundColor: palette.bg,
        color: palette.text,
      }}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}
