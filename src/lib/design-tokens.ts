/** PastQ design system tokens — use via Tailwind classes mapped in globals.css */
export const tokens = {
  colors: {
    primary: "#0D1B2A",
    accent: "#F4A31B",
    accentTint: "#FFFBEB",
    success: "#16A34A",
    successBg: "#DCFCE7",
    errorBg: "#FEE2E2",
    surface: "#F4F6F8",
    card: "#FFFFFF",
    border: "#E2E8F0",
    text: "#1E293B",
    muted: "#64748B",
    teal: "#0D9488",
    tealTint: "#F0FDFA",
  },
  radius: {
    card: "12px",
    button: "8px",
    pill: "999px",
    cardLg: "16px",
  },
  shadow: {
    sm: "0 1px 2px rgba(13, 27, 42, 0.06)",
    md: "0 4px 12px rgba(13, 27, 42, 0.08)",
    lg: "0 8px 24px rgba(13, 27, 42, 0.12)",
  },
} as const;

export type TokenColors = keyof typeof tokens.colors;

/** Tailwind-friendly class bundles */
export const ui = {
  card: "rounded-xl border border-border bg-card shadow-sm transition-shadow duration-200 hover:shadow-md",
  cardLg: "rounded-2xl border border-border bg-card shadow-sm transition-shadow duration-200 hover:shadow-md",
  btnPrimary:
    "inline-flex items-center justify-center rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-navy shadow-sm transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-gold/50",
  btnGhost:
    "inline-flex items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text transition hover:bg-surface active:scale-95 focus:outline-none focus:ring-2 focus:ring-gold/50",
  pill: "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
} as const;
