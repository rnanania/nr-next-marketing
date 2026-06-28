// Day 12: a tiny experiment/flag registry. Real apps use Vercel Flags /
// LaunchDarkly / Optimizely, but the *pattern* is the same: a stable per-user
// assignment, read server-side so the right variant is rendered in the HTML
// (no client flicker / CLS — the A/B-without-hurting-CWV answer).

export type Variant = "A" | "B";

export const EXPERIMENTS = {
  "hero-cta": {
    cookie: "ab-hero-cta",
    // 50/50 split. Variant copy lives with the experiment for one source of truth.
    variants: {
      A: { headline: "Launch your campaign in minutes", cta: "Start free" },
      B: { headline: "Ship landing pages without engineering", cta: "Get a demo" },
    },
  },
} as const;

// Edge-safe random assignment (called in proxy.ts on first visit).
export function assignVariant(): Variant {
  return Math.random() < 0.5 ? "A" : "B";
}

export function isVariant(value: string | undefined): value is Variant {
  return value === "A" || value === "B";
}
