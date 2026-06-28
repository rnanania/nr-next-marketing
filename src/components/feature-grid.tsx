"use client";
// Interactive, filterable card grid — the canonical "client island" for a
// marketing page. Demonstrates the React 19 render model:
//
// - State drives the UI (`query`, `category`); changing it re-renders this island.
// - `useDeferredValue(query)` keeps typing snappy: the input updates immediately,
//   while the (potentially expensive) filtered list lags one tick behind and shows
//   a subtle "stale" state instead of janking each keystroke.
// - NO useMemo / useCallback / React.memo anywhere. The React Compiler memoizes
//   the derived `visible` list and handlers automatically at build time. (Before
//   the compiler you'd wrap `visible` in useMemo to avoid recomputing each render.)
// - `key={f.id}` gives React stable identity for reconciliation (never use index).

import { useState, useDeferredValue } from "react";

type Feature = { id: string; title: string; category: string; desc: string };

const FEATURES: Feature[] = [
  { id: "isr", title: "ISR & on-demand revalidation", category: "Performance", desc: "Publish from the CMS without a redeploy." },
  { id: "ppr", title: "Partial Prerendering", category: "Performance", desc: "Static shell + streamed dynamic holes." },
  { id: "img", title: "Image optimization", category: "Performance", desc: "Automatic sizing, formats, and lazy loading." },
  { id: "meta", title: "Metadata API", category: "SEO", desc: "Per-route titles, descriptions, and OG tags." },
  { id: "sitemap", title: "Sitemaps & robots", category: "SEO", desc: "Generated at the edge for crawlers." },
  { id: "ts", title: "Typed routes", category: "DX", desc: "PageProps/RouteContext generated from the route." },
  { id: "actions", title: "Server Actions", category: "DX", desc: "Mutations without hand-built API routes." },
  { id: "compiler", title: "React Compiler", category: "DX", desc: "Auto-memoization — no manual useMemo." },
];

const CATEGORIES = ["All", "Performance", "SEO", "DX"] as const;

export default function FeatureGrid() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");

  // Deferred: the list filters against this value, which trails fast typing.
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  const q = deferredQuery.trim().toLowerCase();
  const visible = FEATURES.filter(
    (f) =>
      (category === "All" || f.category === category) &&
      (q === "" || f.title.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q)),
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter features…"
          aria-label="Filter features"
          className="flex-1 rounded border border-black/45 px-3 py-2 text-sm dark:border-white/35 dark:bg-transparent"
        />
        <div className="flex gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={
                "rounded px-3 py-1.5 text-sm " +
                (category === c
                  ? "bg-blue-600 text-white"
                  : "border border-black/45 hover:bg-black/5 dark:border-white/35 dark:hover:bg-white/10")
              }
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <ul
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        style={{ opacity: isStale ? 0.6 : 1, transition: "opacity 120ms" }}
      >
        {visible.map((f) => (
          <li key={f.id} className="rounded-lg border border-black/10 p-4 dark:border-white/15">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-300">{f.category}</p>
            <p className="mt-1 font-medium">{f.title}</p>
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">{f.desc}</p>
          </li>
        ))}
      </ul>

      {visible.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">No features match “{deferredQuery}”.</p>
      ) : (
        <p className="text-sm text-black/60 dark:text-white/60">{visible.length} shown.</p>
      )}
    </section>
  );
}
