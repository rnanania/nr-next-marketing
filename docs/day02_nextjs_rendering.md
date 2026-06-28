# Day 2 — Rendering Strategies (SSR / SSG / ISR / Streaming / PPR)

> Target: Next.js **16.2**, React **19.2**. Builds on the Day 1 project
> (`nr-next-marketing/`). This is the **heart of a marketing site** — picking
> the right rendering per page is what drives speed, SEO, and freshness.

## Recap
| Topic | One-liner |
|---|---|
| **SSG** — Static Site Generation | Rendered **at build time** → one HTML file served to everyone. Fastest, best for SEO. |
| **ISR** — Incremental Static Regeneration | Static, but **auto-refreshed** on a timer (stale-while-revalidate). CMS content without redeploys. |
| **SSR** — Server-Side Rendering (Dynamic) | Rendered **on every request** — needed when output depends on the request (cookies, search params, user). |
| **CSR** — Client-Side Rendering | Rendered in the browser after JS loads. Used inside client islands, not for the whole page. |
| **Streaming** | Send the page in chunks: shell first, slow parts stream in later via `<Suspense>`. |
| **`use cache`** | Directive (Cache Components) that caches a function/component's output. Pair with `cacheLife`/`cacheTag`. |
| **PPR** — Partial Prerendering | A **static shell** with **dynamic holes** that stream at request time. Default with Cache Components. |

### Abbreviations
| Short | Full form |
|---|---|
| **SSG** | Static Site Generation |
| **ISR** | Incremental Static Regeneration |
| **SSR** | Server-Side Rendering |
| **CSR** | Client-Side Rendering |
| **PPR** | Partial Prerendering |
| **RSC** | React Server Components |
| **SEO** | Search Engine Optimization |
| **CDN** | Content Delivery Network |
| **FCP** | First Contentful Paint |
| **TTFB** | Time To First Byte |

---

## 1. The Rendering Spectrum — and how to choose

Every page sits somewhere between "fully static" and "fully dynamic." Pick per page:

| Strategy | Rendered… | Use for | In this project |
|---|---|---|---|
| **SSG** | at build | About, Pricing, marketing copy | `/about`, `/pricing` |
| **SSG + `generateStaticParams`** | at build (per slug) | CMS pages with known slugs | `/blog/[slug]` |
| **ISR** | at build, refreshed on timer | Pricing/deals/blog that change occasionally | `/deals` |
| **SSR (Dynamic)** | per request | Personalized / search-param / cookie-driven | `/news` |
| **Streaming** | shell now, rest later | Pages with a slow data dependency | `/news` headlines |

**Mental rule:** *default to static; add dynamism only where the request genuinely
changes the output.* A marketing site should be ~90% static/ISR with a few dynamic holes.

---

## 2. Static Rendering (SSG) — the default

Pages with no request-specific data are prerendered at build. `/about` and `/pricing`
are plain async/sync Server Components → one HTML file each, served from the CDN.

For **dynamic routes**, `generateStaticParams` pre-renders one page per known value:

```tsx
// blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug })); // → 3 static pages
}
```

---

## 3. ISR — static speed + fresh content (no redeploy)

**Incremental Static Regeneration** keeps a page static but refreshes it on a timer.
The first request after the window triggers a background rebuild; meanwhile everyone
still gets fast cached HTML (**stale-while-revalidate**).

Two ways to express it:

```tsx
// Classic (default model): route segment config
export const revalidate = 30;            // seconds

// Modern (Cache Components): cache the data function
async function getDeals() {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 3600 }); // refresh ~every 60s
  ...
}
```

**Why it matters for the JD:** *"Marketing edits a page in the CMS — how does it go
live without a redeploy?"* → ISR. The page is static for speed/SEO, but new content
appears after the revalidation window (or instantly via on-demand revalidation, §8).

`cacheLife` profiles (Cache Components):

| Profile | stale | revalidate | expire |
|---|---|---|---|
| `seconds` | 0 | 1s | 60s |
| `minutes` | 5m | 1m | 1h |
| `hours` | 5m | 1h | 1d |
| `days` | 5m | 1d | 1w |
| `max` | 5m | 30d | ~∞ |

> Short-lived caches (`seconds`, `revalidate: 0`, or `expire` < 5min) are excluded
> from the static shell and become dynamic holes instead.

---

## 4. Dynamic Rendering (SSR)

A route becomes **dynamic** when it reads request-time data. Those **runtime APIs** are:

- `searchParams` (URL query) and `params` (unless a sample is given via `generateStaticParams`)
- `cookies()` and `headers()` (from `next/headers`)
- `connection()` (explicit "defer to request time")

```tsx
// /news reads searchParams → dynamic
export default async function NewsPage({ searchParams }) {
  const { topic } = await searchParams;     // request-time
  const requestTime = new Date().toISOString();
  ...
}
```

Reading `searchParams` opts the route into per-request rendering — which is why two
reloads of `/news` show **different timestamps** (proven below).

---

## 5. Streaming + Suspense + `loading.tsx`

Streaming lets you send the **fast parts now** and **stream slow parts in later**,
instead of blocking the whole page on the slowest query.

```tsx
<Suspense fallback={<p>Loading headlines…</p>}>
  <SlowHeadlines />     {/* 2s data — streams in when ready */}
</Suspense>
```

- The fallback is sent **immediately** as part of the shell.
- When `<SlowHeadlines>` resolves, its HTML **streams in** and replaces the fallback.
- `loading.tsx` is a shortcut: Next auto-wraps the **whole route** in `<Suspense>`
  using it as the fallback during navigation (`/news/loading.tsx` in this project).

`<Suspense>` alone doesn't make something dynamic — a synchronous/cached child still
prerenders. To force a child to stream at request time, give it runtime data or call
`await connection()` (what `SlowHeadlines` does).

---

## 6. The Modern Model — Cache Components + `use cache`

Enable it once in config:

```ts
// next.config.ts
const nextConfig = { cacheComponents: true };
```

Now caching is **explicit and opt-in** via the `use cache` directive:

```tsx
// data-level: cache a function's result
export async function getPosts() {
  "use cache";
  cacheLife("days");
  cacheTag("posts");      // tag → invalidate on demand later
  return posts;
}

// UI-level: cache a whole component/page
export default async function Page() {
  "use cache";
  cacheLife("hours");
  ...
}
```

**The rules Cache Components enforces** (this is the mental model):
- **Cached** (`use cache`) → goes into the **static shell**.
- **Wrapped in `<Suspense>`** with runtime data → **streams** as a dynamic hole.
- **Deterministic** sync work → prerendered automatically.
- **Uncached runtime data outside `<Suspense>`** → **build error**
  (`Uncached data was accessed outside of <Suspense>`). This forces you to be
  intentional about what's static vs dynamic.
- **Non-deterministic** ops (`new Date()`, `Math.random()`, `crypto.randomUUID()`)
  must be either cached (same value for everyone) or deferred with `connection()` +
  `<Suspense>` (unique per request). *(That's why `SiteFooter`'s `new Date()` got
  `use cache`.)*

---

## 7. Partial Prerendering (PPR) — the payoff

With Cache Components, **PPR is the default**: a single route can be **mostly static
HTML with dynamic holes** that stream in. You get static speed/SEO *and* per-request
data on the same page — no all-or-nothing choice.

```
/news:
┌─────────────────────────────┐
│  <h1>News</h1>   ← static shell (prerendered, instant)
│  ┌───────────────────────┐  │
│  │ NewsMeta (searchParams)│ ← dynamic hole (streams)
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ SlowHeadlines (2s)     │ ← dynamic hole (streams)
│  └───────────────────────┘  │
└─────────────────────────────┘
```

Build output marks these routes with **`◐` (Partial Prerender)**.

---

## 8. On-Demand Revalidation (mutations)

Time-based revalidation is one half; the other is invalidating **the moment content
changes** (e.g., a CMS webhook or an admin publishing a post).

| API | Where | Behavior | Use case |
|---|---|---|---|
| `revalidateTag(tag)` | Server Action **or** Route Handler | stale-while-revalidate | CMS publish / background refresh |
| `updateTag(tag)` | Server Action only | **immediately** expires | Read-your-own-writes (user sees change now) |
| `revalidatePath(path)` | Server Action or Route Handler | invalidate a whole route | When you don't know the tags |

```tsx
// e.g. a CMS webhook hits a Route Handler:
import { revalidateTag } from "next/cache";
export async function POST() {
  revalidateTag("posts");          // our getPosts/getPost are tagged "posts"
  return Response.json({ revalidated: true });
}
```

This is the **exact Contentful pattern** (Day 11): publish → webhook → `revalidateTag`
→ next visitor sees fresh content, no redeploy. Prefer **tags** over paths (more precise).

---

## Build Exercise — ✅ BUILT & RUNNING

All added to the Day 1 project (`nr-next-marketing/`):

| Concept | Where |
|---|---|
| ISR (cached + timed revalidate) | `src/app/(marketing)/deals/page.tsx` |
| Dynamic SSR (searchParams + timestamp) | `src/app/(marketing)/news/page.tsx` → `NewsMeta` |
| Streaming via `<Suspense>` | `news/page.tsx` + `src/components/slow-headlines.tsx` |
| Route-level `loading.tsx` | `src/app/(marketing)/news/loading.tsx` |
| `use cache` + `cacheLife` + `cacheTag` | `src/lib/posts.ts`, `deals`, home `getTeamCount`, `site-footer` |
| Cache Components / PPR | `next.config.ts` (`cacheComponents: true`) |

Run it:
```bash
cd nr-next-marketing
npm run dev          # http://localhost:3000  → visit /deals and /news
npm run build        # see the ○ / ◐ render-type table
```

---

## Hands-On Walkthrough — Day 2 Concepts Proven in This Project

### A. The build table tells you each page's strategy
**Before** Cache Components (default model):
```
○ /deals       30s   1y      ← ISR (export const revalidate = 30)
ƒ /news                       ← Dynamic (reads searchParams)
● /blog/[slug]                ← SSG (generateStaticParams)
○ /about /pricing             ← Static
```
**After** enabling `cacheComponents: true`:
```
○ /              1h   1d      ← home cached hourly (use cache)
○ /deals         1m   1h      ← ISR via cacheLife (revalidate 60s)
○ /about /blog   1d   1w      ← static (footer use cache = days)
◐ /news          1d   1w      ← Partial Prerender (shell + dynamic holes)
◐ /blog/[slug]   1d   1w      ← Partial Prerender

◐ (Partial Prerender) prerendered as static HTML with dynamic server-streamed content
```
**What this proves:** the symbol encodes the strategy — `○` static, `●` SSG, `ƒ` dynamic,
`◐` PPR. Enabling Cache Components turned `/news` and `/blog/[slug]` into PPR routes.

### B. Dynamic SSR — output changes every request
Two requests to `/news`, ~1s apart, returned **different** server timestamps:
```
req1: 2026-06-08T19:20:24.374Z
req2: 2026-06-08T19:20:27.515Z
differ (proves per-request render): true
```
**What this proves:** reading `searchParams` (and `connection()`) makes the hole render
on every request — not cached.

### C. Streaming / PPR — shell first, holes later
Reading the raw streamed response of `/news` with a byte timer:
```
static shell <h1>News  at ~ 63 ms     ← prerendered shell, instant
streamed headline      at ~ 2057 ms   ← dynamic hole arrives after the 2s fetch
fallback "Loading headlines…" present in the stream: true
```
**What this proves:** the user sees the shell + fallbacks in ~60ms (great FCP), and the
slow content streams in 2s later **without blocking** the rest of the page. That's PPR.

### D. `use cache` — same output for everyone until revalidation
Two rapid requests to `/deals` returned the **same** generated timestamp:
```
/deals cached timestamp stable across requests: true (2026-06-08T19:23:59.972Z)
```
The home page's cached server fetch ("Trusted by 10+ teams") and the cached footer year
are both still present. **What this proves:** `use cache` froze the values into the shell;
they'll only change after `cacheLife`'s window (or an on-demand revalidate).

### Try-it-yourself experiments
1. **Watch ISR flip:** open `/deals`, note the timestamp, refresh fast (stays same),
   wait ~60s, refresh → it updates. That's stale-while-revalidate.
2. **Watch streaming:** DevTools → Network → Slow 4G, load `/news` → "News" + skeletons
   appear instantly, headlines pop in ~2s later.
3. **Trigger the PPR guardrail:** remove the `<Suspense>` around `<SlowHeadlines>` in
   `news/page.tsx` and rebuild → Next errors with *"Uncached data accessed outside of
   `<Suspense>`"*. Put it back. (This is Cache Components forcing intentional dynamism.)
4. **Make something dynamic:** add `cacheLife("seconds")` to a `use cache` function and
   rebuild → it becomes a dynamic hole (short-lived caches leave the static shell).

---

## Self-Check Questions & Answers

**1. SSG vs ISR vs SSR — when do you use each on a marketing site?**
**SSG** for content that's the same for everyone and changes only on deploy (About,
Pricing copy). **ISR** for content that changes occasionally and should update without a
redeploy (CMS-driven pages, deals, blog) — static speed + a revalidation timer. **SSR/
dynamic** only when the output depends on the request (cookies, search params, logged-in
user, geolocation). Default to static; reach for dynamic surgically.

**2. What is ISR and how does "stale-while-revalidate" work?**
ISR serves a cached static page while refreshing it in the background on a timer. After
the `revalidate` window, the **next** request still gets the stale (fast) page, and Next
regenerates a fresh version behind the scenes for subsequent requests. No user waits for
a rebuild, and you avoid full redeploys for content changes.

**3. What makes a route dynamic in the App Router?**
Reading **runtime data**: `searchParams`, `cookies()`, `headers()`, `params` without a
`generateStaticParams` sample, or calling `connection()`. Any of these requires the
incoming request, so the route (or, under PPR, that hole) renders per request.

**4. What is streaming and how do you implement it?**
Streaming sends the page in chunks so users see the fast parts immediately while slow
parts load. Wrap a slow async Server Component in `<Suspense fallback={…}>`; the fallback
ships in the initial shell and the resolved content streams in. `loading.tsx` does this
for a whole route automatically during navigation.

**5. What is Partial Prerendering (PPR) and why is it valuable?**
PPR renders a **static shell** (instant, SEO-friendly) with **dynamic holes** that stream
at request time — on the **same page**. You no longer choose static *or* dynamic for the
whole route; you get static performance for the shell and per-request data where needed.
It's the default with Cache Components and shows as `◐` in the build.

**6. In the Cache Components model, how do you cache vs stream vs personalize?**
**Cache** stable data with `use cache` + `cacheLife` (goes into the static shell).
**Stream** slow/dynamic data by wrapping it in `<Suspense>` (a dynamic hole). For
**personalized-but-cacheable** data, read the runtime value (e.g. a cookie) in an
uncached component and pass it as an argument to a `use cache` function — the argument
becomes part of the cache key.

**7. Time-based vs on-demand revalidation — and which API?**
Time-based = `cacheLife`/`revalidate` (refresh on a schedule). On-demand = invalidate the
moment data changes: `revalidateTag` (stale-while-revalidate; Actions or Route Handlers),
`updateTag` (immediate; Actions only, for read-your-own-writes), `revalidatePath` (whole
route). Prefer **tags** — more precise than paths. This is how a CMS webhook publishes
new content instantly.

---

## Interview Soundbites (tie to your NBA.com work)
- *"On NBA.com, high-traffic pages like Home and Schedule were statically generated and
  served from CDN/Akamai for speed and SEO, with ISR so editorial changes went live
  without a redeploy — that's the SSG + revalidation model."*
- *"For request-specific UI I'd isolate it as a dynamic hole and stream it with Suspense,
  so the static shell still hits the CDN and Core Web Vitals stay green — exactly what
  Partial Prerendering formalizes in Next 16."*
- *"For a Contentful-driven site I'd tag cached content and revalidate on the publish
  webhook (`revalidateTag`), so marketers get instant updates with static performance."*
