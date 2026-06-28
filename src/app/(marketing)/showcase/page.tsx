// Day 6 demo page — a responsive hero + feature grid built entirely on the
// Tailwind v4 @theme design system in globals.css. Everything visual here pulls
// from tokens (brand-*, surface, ink, radius-card, spacing-section), so the
// design is consistent and re-themeable from one place.

import Link from "next/link";
import { cn } from "@/lib/cn";

export const metadata = {
  title: "Showcase — Acme",
  description: "Responsive hero + feature grid themed via Tailwind v4 @theme.",
};

const features = [
  { title: "OKLCH tokens", body: "A perceptually-uniform brand scale defined once in @theme." },
  { title: "Container queries", body: "Cards reflow to their container's width, not the viewport." },
  { title: "Runtime theming", body: "Toggle dark mode — semantic tokens flip instantly." },
  { title: "No class bloat", body: "@utility + @apply + cn() keep markup lean and consistent." },
];

export default function ShowcasePage() {
  return (
    <div className="space-y-section">
      {/* HERO — responsive type scale + brand gradient from tokens. */}
      <section className="overflow-hidden rounded-card bg-linear-to-br from-brand-700 to-brand-900 px-6 py-12 text-white sm:px-10 sm:py-16 lg:py-20">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-100">
          Marketing platform
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
          Ship pixel-perfect campaign pages, fast.
        </h1>
        <p className="mt-4 max-w-xl text-base text-white/80 sm:text-lg">
          A design system in CSS — brand tokens, dark mode, and responsive layout
          without a single line of config.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {/* btn-brand = an @apply component class from globals.css */}
          <Link href="/pricing" className="btn-brand">Get started</Link>
          <Link
            href="/features"
            className="inline-flex items-center rounded-md bg-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/25"
          >
            See features
          </Link>
        </div>
      </section>

      {/* FEATURE GRID — a @container, so cards reflow on the CONTAINER's width.
          Resize this region (not just the window) and the columns change. */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Why teams pick Acme</h2>
        <div className="@container">
          <ul className="grid grid-cols-1 gap-4 @md:grid-cols-2 @4xl:grid-cols-4">
            {features.map((f) => (
              <li
                key={f.title}
                // `card-elevated` is a custom @utility; `group` enables the
                // child hover animation below.
                className={cn("card-elevated group p-5", "ring-1 ring-black/5 dark:ring-white/10")}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-ink">{f.title}</h3>
                  <span className="text-brand-600 dark:text-brand-300 transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink-muted">{f.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* PEER demo — the label reacts to the input's focus state via `peer`. */}
      <section className="max-w-md space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Stay in the loop</h2>
        <div className="relative">
          <input
            id="email"
            type="email"
            placeholder=" "
            className="peer w-full rounded-md border border-black/45 bg-surface px-3 pt-5 pb-2 text-sm text-ink outline-none focus:border-brand-500 dark:border-white/35"
          />
          <label
            htmlFor="email"
            className="pointer-events-none absolute left-3 top-3.5 text-sm text-ink-muted transition-all peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-brand-600 peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-xs"
          >
            Work email
          </label>
        </div>
      </section>
    </div>
  );
}
