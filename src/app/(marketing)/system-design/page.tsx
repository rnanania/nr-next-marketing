// Day 16 — System Design, made concrete. The whiteboard answer to "design a
// high-traffic, CMS-driven marketing site that marketers can self-serve" — grounded
// in THIS app's real routes. Static server component (pure content → prerendered).
// Complements /architecture (Day 14: cloud/hosting); this is the application design:
// rendering strategy per page, the self-serve CMS loop, caching & invalidation,
// scalability for spikes, multi-environment, and performance budgets.

import Link from "next/link";

export const metadata = {
  title: "System Design — Pace",
  description:
    "End-to-end system design of a scalable, CMS-driven marketing site that marketers self-serve — rendering strategy per route, caching, invalidation, and scale (Day 16).",
};

const systemDiagram = `Visitor
  │  DNS
  ▼
CDN / Edge  ──(proxy.ts: A/B bucket + first-touch UTM)──►  static shell from cache (~ms)
  │  cache miss / dynamic hole
  ▼
Next render  ──  SSG  ·  ISR  ·  PPR  ·  Dynamic  ──►  chosen per route (see matrix)
  │
  ├─►  Contentful   (Delivery API · Preview API in draft mode)   ◄── marketers publish
  │         ▲ on publish → webhook → POST /api/revalidate?tag=… → revalidateTag()
  ├─►  3rd-party APIs · Marketo (leads, server-side REST)
  └─►  Analytics: GTM dataLayer · Vercel Web Analytics + Speed Insights (RUM)`;

const renderRows: [string, string, string, string][] = [
  ["Evergreen marketing", "/pricing, /about, /features, /showcase", "SSG (static)", "Rarely changes → pure CDN reads, near-zero compute, infinite scale."],
  ["CMS-driven content", "/ (home), /blog, /landing, /integrations", "Static + ISR (use cache + cacheLife/cacheTag)", "Marketers publish → refresh without a redeploy; static speed + freshness."],
  ["Time-sensitive", "/deals", "ISR, short window (1m)", "Offers change often; a tight revalidate keeps it fresh, still cached."],
  ["Per-request / personalized", "/campaign (A/B+UTM), /news, /status, /blog/[slug]", "PPR (static shell + streamed holes)", "Static shell instantly; only the dynamic bit runs at request time — no full SSR, no flicker."],
  ["Mutations / live data", "/subscribe (action), /api/health, /api/revalidate", "Dynamic / Server Actions / Route Handlers", "Request-time by nature (writes, live status, webhooks)."],
];

export default function SystemDesignPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">System Design</h1>
        <p className="max-w-2xl text-black/70 dark:text-white/70">
          The whiteboard answer to <em>&ldquo;design a high-traffic, CMS-driven marketing
          site that marketers can self-serve&rdquo;</em> — grounded in this app&apos;s real
          routes. For the cloud/hosting layer see{" "}
          <Link href="/architecture" className="underline underline-offset-2 hover:text-ink">
            Architecture
          </Link>{" "}
          (Day 14).
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">End-to-end system</h2>
        <pre className="overflow-x-auto rounded-card border border-border bg-surface-muted/60 p-4 text-xs leading-relaxed">
          {systemDiagram}
        </pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Rendering strategy per route</h2>
        <p className="max-w-2xl text-sm text-ink-muted">
          The core trade-off: <strong>SSG</strong> is fastest/cheapest but stale until
          rebuild; <strong>ISR</strong> adds freshness without a redeploy;{" "}
          <strong>PPR</strong> serves a static shell with dynamic holes; full{" "}
          <strong>dynamic</strong> is always fresh but pays compute per request. Pick per
          page — here&apos;s how this app actually decides:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-4 font-semibold">Page class</th>
                <th className="py-2 pr-4 font-semibold">Example routes</th>
                <th className="py-2 pr-4 font-semibold">Strategy</th>
                <th className="py-2 font-semibold">Why</th>
              </tr>
            </thead>
            <tbody>
              {renderRows.map(([cls, routes, strategy, why]) => (
                <tr key={cls} className="border-b border-border/60 align-top">
                  <td className="py-2 pr-4 font-medium">{cls}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-ink-muted">{routes}</td>
                  <td className="py-2 pr-4 text-ink-muted">{strategy}</td>
                  <td className="py-2 text-ink-muted">{why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="max-w-2xl space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Self-serve CMS loop</h2>
        <p className="text-sm text-black/70 dark:text-white/70">
          Marketers own the content without engineering in the loop:
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-black/70 dark:text-white/70">
          <li>Editor publishes a page in Contentful (page-builder blocks, zod-validated at our boundary).</li>
          <li>Contentful fires a webhook → <code>POST /api/revalidate?tag=…</code>.</li>
          <li>We call <code>revalidateTag()</code> → the next request re-renders just that page.</li>
          <li>Live in seconds — <strong>no redeploy</strong>. Drafts preview via the Preview API + draft mode.</li>
        </ol>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">Scaling for spikes</h2>
          <ul className="space-y-1 text-sm text-ink-muted">
            <li>• Caching layers: browser → <strong>CDN edge</strong> → data/ISR cache → origin.</li>
            <li>• A campaign 100× spike mostly hits the CDN; only misses reach compute.</li>
            <li>• A/B + UTM run at the <strong>edge</strong> (proxy.ts) — no client-side flicker or JS cost.</li>
            <li>• Static-first keeps the bill flat and latency low under load.</li>
          </ul>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">Cache invalidation</h2>
          <ul className="space-y-1 text-sm text-ink-muted">
            <li>• <strong>Time-based</strong> (<code>cacheLife</code>) for predictable freshness.</li>
            <li>• <strong>Tag-based on-demand</strong> (<code>revalidateTag</code>) for instant CMS publishes.</li>
            <li>• <strong>Stale-while-revalidate</strong> so users never wait on a refresh.</li>
            <li>• The hard part: scoping tags so one publish invalidates exactly the right pages.</li>
          </ul>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">Multi-environment</h2>
          <ul className="space-y-1 text-sm text-ink-muted">
            <li>• Prod (main) · Preview (every PR) · local dev — Vercel Git integration.</li>
            <li>• Draft mode + Preview API token so editors see unpublished content.</li>
            <li>• Secrets per-environment, server-only (Day 14).</li>
          </ul>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">Performance budgets</h2>
          <ul className="space-y-1 text-sm text-ink-muted">
            <li>• Targets: LCP ≤ 2.5s · INP ≤ 200ms · CLS ≤ 0.1 (Day 9).</li>
            <li>• Ship less JS via RSC; lazy-load client islands; optimize images.</li>
            <li>• Enforce with Speed Insights (RUM) + CI gates.</li>
            <li>• At scale don&apos;t prebuild 100k pages — top-N via generateStaticParams, the rest on-demand ISR.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
