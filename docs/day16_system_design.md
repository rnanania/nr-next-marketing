# Day 16 — System Design: Scalable Marketing Site

> Target: Next **16.2** on **Vercel**. Exercise: **whiteboard "design a high-traffic,
> CMS-driven marketing site that marketers can self-serve."** This day ties Days 1–15
> together into one architecture and makes it runnable as the `/system-design` page —
> grounded in this app's *actual* routes, not a hypothetical.

## Recap
| Topic | One-liner |
|---|---|
| **Rendering per route** | Pick SSG / ISR / PPR / dynamic page-by-page based on freshness vs cost. |
| **Self-serve CMS** | Marketers publish → webhook → on-demand revalidate → live, no redeploy. |
| **Caching layers** | browser → CDN edge → data/ISR cache → origin; the CDN is the load shield. |
| **Cache invalidation** | Time-based (`cacheLife`) + tag-based on-demand (`revalidateTag`) + SWR. |
| **Scale for spikes** | Static-first so a campaign 100× hits cache, not compute. |
| **Multi-environment** | prod / preview-per-PR / dev; draft mode for editors. |
| **Performance budgets** | LCP/INP/CLS targets enforced with RUM + CI. |

### Abbreviations
| Short | Full form |
|---|---|
| **SSG / ISR / PPR** | Static Generation / Incremental Static Regeneration / Partial Prerendering |
| **SWR** | Stale-While-Revalidate |
| **RUM** | Real User Monitoring (Day 9) |
| **RSC** | React Server Components |

---

## 1. The one-paragraph answer
Build **static-first** on Next.js + Contentful behind a CDN. Prerender what you can
(SSG), add **ISR** so marketers refresh content without a redeploy, and use **PPR** for
pages that need a per-request bit (A/B, personalization, live data) — a static shell
with streamed dynamic holes. Marketers self-serve via a **publish → webhook →
`revalidateTag`** loop. The CDN absorbs traffic spikes; only cache misses hit compute.
Experiments run at the **edge** so they don't cost client performance. Analytics and
lead capture hang off the side (GTM dataLayer, Vercel RUM, Marketo server-side).

## 2. Rendering strategy per route (the core trade-off)
| Strategy | Fresh? | Cost | Use when |
|---|---|---|---|
| **SSG** | stale until rebuild | ~0 (CDN read) | evergreen pages (pricing, about) |
| **ISR** | refreshes on a window / on-demand | low | CMS content (home, blog, landing) |
| **PPR** | shell static + holes live | low + per-hole | personalization / live bits (campaign, status) |
| **Dynamic / SSR** | always | per-request compute | mutations, live data, webhooks |

Grounded in this app (real build output): `○` static = /pricing, /about, /features,
/showcase, /blog, /landing (+ ISR via `cacheLife`); `◐` PPR = /campaign, /news, /status,
/architecture, /blog/[slug]; `ƒ` dynamic = /api/*, server actions.

## 3. Self-serve CMS loop
```
Editor publishes in Contentful
   → Contentful webhook → POST /api/revalidate?tag=…
   → revalidateTag()  → next request re-renders just that page
   → live in seconds, NO redeploy   (drafts preview via Preview API + draft mode)
```
Content is **zod-validated at our boundary**, so bad CMS data can't reach production.

## 4. Caching & invalidation
- **Layers:** browser cache → CDN edge → Next data/ISR cache → origin (Contentful/API).
- **Invalidation:** time-based `cacheLife` for predictable freshness; **tag-based
  `revalidateTag`** for instant publishes; SWR so users never wait. The hard part is
  *scoping tags* so one publish busts exactly the right pages — not the whole site.

## 5. Scale, environments, budgets
- **Spikes:** static-first → CDN serves the surge; edge A/B avoids client cost.
- **Build at scale:** don't prebuild 100k pages — `generateStaticParams` for the top N,
  the long tail on-demand via ISR.
- **Environments:** prod (main), a preview deploy per PR, local dev; draft mode for
  editors; secrets server-only per environment.
- **Budgets:** LCP ≤ 2.5s · INP ≤ 200ms · CLS ≤ 0.1, enforced with Speed Insights (RUM)
  + CI gates.

## Build Exercise
| What | Where |
|---|---|
| The runnable whiteboard: system diagram + rendering matrix + CMS loop + scale/cache/env/budgets | `src/app/(marketing)/system-design/page.tsx` |
| Discoverable in nav + study note | `src/components/site-header.tsx`, `src/lib/study-notes.ts` |

## Hands-On Walkthrough (proven)
**Build — the page is static; the matrix mirrors the real route table:**
```
$ npm run build
└ ○ /system-design                                1d      1w
# real routes that back the matrix:
○ / · /pricing · /about · /blog · /landing      (SSG / ISR)
◐ /campaign · /news · /status · /blog/[slug]     (PPR)
ƒ /api/health · /api/revalidate                  (Dynamic)
```

**Served HTML — diagram, matrix, and the self-serve loop render:**
```
$ curl -s localhost:3000/system-design | grep -oE "SSG \(static\)|PPR \(static shell|revalidateTag"
SSG (static)
PPR (static shell
revalidateTag
```

This day is a **design synthesis**, so the artifact is a documented, runnable page
rather than new infrastructure — every claim links to a real route/feature already
built and verified in Days 1–15.

## Try-it-yourself
- Open `/system-design` next to `/architecture` (Day 14) — application design vs cloud.
- Cross-check the matrix against `npm run build`'s route table (`○`/`◐`/`ƒ`).
- Trace a publish: edit Contentful → webhook → `/api/revalidate?tag=…` → reload `/landing`.

## Self-Check Q&A
- **"Design a high-traffic, CMS-driven marketing site marketers self-serve."** (JD) →
  static-first on Next + Contentful behind a CDN; SSG/ISR/PPR per page; publish→webhook→
  `revalidateTag` for self-serve; CDN absorbs spikes; edge experiments; RUM budgets.
- **"SSG vs ISR vs SSR vs PPR — when each?"** → see §2: freshness vs compute cost,
  page by page.
- **"A marketer edits a page — how does it go live without a deploy?"** → on-demand ISR:
  Contentful webhook → `revalidateTag` → next request re-renders that page.
- **"How do you keep build times sane at 100k pages?"** → prebuild top-N, on-demand ISR
  for the long tail; never block deploys on a full static build.
- **"Hardest part of caching?"** → invalidation — scoping tags so one change busts
  exactly the right pages.

## Interview Soundbites
- *"I design static-first and choose rendering per page — evergreen is SSG, CMS content
  is ISR, anything personalized is PPR so the shell still ships instantly. The CDN is the
  scaling story: a launch spike hits cache, not Lambda."*
- *"Self-serve is a publish→webhook→`revalidateTag` loop with zod validation at the
  boundary — marketers ship content in seconds, engineering isn't in the path, and bad
  data can't reach prod."*
- *"This whole app *is* the reference design — the `/system-design` page's rendering
  matrix is literally the route table the build produces."*
