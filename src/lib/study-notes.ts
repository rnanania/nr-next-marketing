// A UI teaching layer: every marketing page carries a short "what you're learning
// here" note, rendered at the bottom of the page (see components/study-note.tsx).
// The point is a self-guided tour — a new team member can click through the site
// and read, in the UI, which part of docs/study_plan.md each page demonstrates.
//
// This is the single source of truth: one entry per route. Keyed by pathname so the
// note is picked automatically in the shared (marketing) layout.

export type StudyNote = {
  days: string; // study-plan label, e.g. "Days 1–2" — ties back to docs/study_plan.md
  title: string; // the concept this page showcases
  summary: string; // one short paragraph for the walkthrough
};

export const STUDY_NOTES: Record<string, StudyNote> = {
  "/": {
    days: "Days 1–2 · App Router & Rendering",
    title: "Server Components + Static Generation",
    summary:
      "The home page is an async Server Component: it fetches data on the server (shipping zero data-fetching JS to the browser) and is statically prerendered (SSG), with a priority-loaded hero as the LCP element. This is the App Router baseline everything else builds on.",
  },
  "/pricing": {
    days: "Day 2 · Rendering",
    title: "Static Site Generation (SSG)",
    summary:
      "A pure Server Component prerendered to static HTML at build time and served instantly from the CDN/edge. The simplest, fastest rendering case — ideal for content that rarely changes.",
  },
  "/about": {
    days: "Day 1 · App Router",
    title: "Static Server Component",
    summary:
      "A minimal static page prerendered at build with zero client JS — the 'just HTML' baseline. Shows the App Router file conventions (a folder + page.tsx becomes a route).",
  },
  "/blog": {
    days: "Days 1–2 · Routing & Rendering",
    title: "Server-rendered content list",
    summary:
      "A Server Component that lists posts and links to each with prefetching. Demonstrates routing, layouts, and statically rendering a content index that links into dynamic routes.",
  },
  "/blog/[slug]": {
    days: "Days 1 & 10 · Dynamic Routes & SEO",
    title: "Dynamic routes the Next 16 way",
    summary:
      "Shows the four essentials of a dynamic route: async params (now a Promise — you await it), generateStaticParams to prerender every known slug (SSG), generateMetadata for per-post SEO, and notFound() for unknown slugs.",
  },
  "/features": {
    days: "Day 4 · React 19 Advanced & Performance",
    title: "Client islands + React 19 hooks",
    summary:
      "A static server shell composing two client islands: a filterable grid (useDeferredValue, auto-memoized by the React Compiler — no hand-written useMemo) and an optimistic feedback form (useActionState + useOptimistic). Also shows React 19 native document metadata.",
  },
  "/integrations": {
    days: "Day 3 · Data, Caching & 3rd-Party APIs",
    title: "Cached data + on-demand revalidation",
    summary:
      "Upstream third-party data is frozen into the static shell with `use cache` + cacheTag, and only changes when the 'todos' tag is revalidated — by the button's Server Action or a webhook route. Reload all you like; the data stays put until revalidated. This is the CMS pattern.",
  },
  "/subscribe": {
    days: "Day 3 · Server Actions",
    title: "Mutations via a Server Action",
    summary:
      "A static shell plus a small client form wired to a Server Action that validates on the server and returns an inline result. Because it's a real <form action>, it works before JS hydrates (progressive enhancement).",
  },
  "/deals": {
    days: "Day 2 · ISR",
    title: "Incremental Static Regeneration",
    summary:
      "`use cache` + cacheLife serves fast cached HTML to everyone and refreshes it in the background after the revalidate window (stale-while-revalidate) — fresh content with no redeploy. The modern Cache Components take on ISR.",
  },
  "/news": {
    days: "Day 2 · PPR & Streaming",
    title: "Partial Prerendering",
    summary:
      "The Cache Components default: a static shell streams two dynamic holes (a request-time timestamp and slow data) wrapped in <Suspense>. Users get the shell instantly while the dynamic parts stream in — static speed with dynamic content.",
  },
  "/landing": {
    days: "Day 11 · Headless CMS",
    title: "CMS-driven page builder (Contentful)",
    summary:
      "Loads zod-validated content from Contentful and hands the blocks to a BlockRenderer that resolves each by its discriminant (page-builder pattern), type-safe end to end. Draft mode lets editors preview unpublished content.",
  },
  "/design-system": {
    days: "Day 7 · Design Systems",
    title: "shadcn/ui + Radix gallery",
    summary:
      "A living component gallery: shadcn/ui (copy-in source you own) built on Radix primitives and themed by our @theme tokens. The page is a Server Component; the interactive pieces (Dialog, toasts, form) are client islands.",
  },
  "/showcase": {
    days: "Day 6 · Tailwind v4",
    title: "Design tokens via @theme",
    summary:
      "A responsive hero + feature grid built entirely on Tailwind v4 @theme tokens (brand-*, surface, ink, radius, spacing). The whole look pulls from one place in globals.css, so it's consistent and re-themeable.",
  },
  "/metrics": {
    days: "Day 9 · Core Web Vitals",
    title: "Public, self-hosted RUM",
    summary:
      "Real-user Core Web Vitals (LCP/INP/CLS/FCP/TTFB) measured live in your browser via Next.js's useReportWebVitals, collected through an external store and read with useSyncExternalStore. A public alternative to the private Vercel Speed Insights dashboard.",
  },
  "/campaign": {
    days: "Day 12 · Marketing Integrations",
    title: "A/B + UTM attribution + Marketo",
    summary:
      "The marketing stack on one page: an edge-assigned A/B hero (no flicker/CLS), UTM attribution captured first-touch at the edge, and a Marketo lead form with server-side submit + a GTM `generate_lead` event. Experimentation and lead capture without hurting performance.",
  },
};

// Pick the note for a path. Exact match first, then the dynamic blog post route.
export function getStudyNote(pathname: string): StudyNote | null {
  if (STUDY_NOTES[pathname]) return STUDY_NOTES[pathname];
  if (pathname.startsWith("/blog/")) return STUDY_NOTES["/blog/[slug]"];
  return null;
}
