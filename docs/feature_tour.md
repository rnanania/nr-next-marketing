# Feature Tour — The Power of Next.js, Proven Live

> A hands-on, runnable tour of the Next.js 16 features built into **Pace**
> (`nr-next-marketing`). Each "station" gives you: **what it is**, **where it
> lives in this codebase**, and **how to see it with your own eyes** — browser
> DevTools, the Vercel dashboard, or `curl`. Every output below was captured
> against the live deployment, so you can reproduce it.
>
> Live site: **https://nr-next-marketing.vercel.app**

## How to use this doc
- Run the `curl` commands yourself — they hit the real deployment.
- Where it says **Browser**, open DevTools (`Cmd+Option+I`) and follow along.
- The single most important artifact is the **route table** (below): the `○ ◐ ƒ`
  symbols *are* the whole story.

```bash
npm run build   # prints the route table; ○ static · ◐ partial-prerender · ƒ dynamic
```

## The map — your build's route table
```
Route (app)                       Revalidate  Expire
○  /                  (Static)         1h      1d     ← prerendered HTML
○  /about, /pricing…  (Static)         1d      1w
○  /deals             (Static)         1m      1h     ← fast-moving use cache
◐  /blog/[slug]       (Partial PPR)    1d      1w     ← static shell + streamed dynamic
◐  /campaign          (Partial PPR)    1d      1w     ← A/B hero via edge proxy
◐  /news              (Partial PPR)    1d      1w
ƒ  /api/revalidate    (Dynamic)                       ← runs on every request
ƒ  /sitemap.xml, /opengraph-image (Dynamic)

○ Static   ◐ Partial Prerender   ƒ Dynamic
```

## Recap — the seven stations
| # | Feature | The "aha" | Where in code |
|---|---|---|---|
| 1 | **Rendering modes** `○ ◐ ƒ` | Static pages served from edge cache (`HIT`), zero server compute | route table; `src/lib/site.ts` |
| 2 | **Partial Prerendering (PPR)** | One page = static shell **+** streamed dynamic holes | `src/app/(marketing)/campaign/page.tsx` |
| 3 | **Edge A/B testing** | Variant chosen at the edge, no flicker/CLS | `src/proxy.ts`, `src/lib/flags.ts` |
| 4 | **Cache Components + revalidation** | `use cache` + time-based + on-demand tag busting | `src/app/api/revalidate/route.ts`, `src/lib/remote.ts` |
| 5 | **Server Actions** | Form mutation with no API route, no `fetch` | `src/lib/actions.ts`, `src/components/subscribe-form.tsx` |
| 6 | **SEO as code** | sitemap/robots/OG image generated; one source of truth | `src/app/sitemap.ts`, `robots.ts`, `opengraph-image.tsx` |
| 7 | **CMS boundary** | zod validation + fixture fallback + Draft Mode | `src/lib/cms/*`, `src/app/api/preview/*` |

### Abbreviations
| Short | Full form |
|---|---|
| **PPR** | Partial Prerendering (static shell + streamed dynamic holes) |
| **RSC** | React Server Component(s) |
| **CWV** | Core Web Vitals |
| **CLS** | Cumulative Layout Shift |
| **SWR** | Stale-While-Revalidate (serve stale, refresh in background) |
| **BFF** | Backend-For-Frontend (a route handler proxying a 3rd-party API) |
| **UTM** | Urchin Tracking Module (campaign attribution query params) |

---

## Station 1 — Rendering modes (`○ ◐ ƒ`) and edge caching

**What it is.** Next decides *per route* how to render: fully static HTML at build
(`○`), dynamic on every request (`ƒ`), or a hybrid (`◐`). This is the single
biggest lever for performance and cost.

**See it (Browser).** Open the site → Network tab → reload → click the document
request → Response Headers.

**See it (`curl`).**
```bash
URL=https://nr-next-marketing.vercel.app
curl -sI "$URL/"           | grep -iE "x-vercel-cache|x-nextjs-prerender|age:"
curl -sI "$URL/sitemap.xml"| grep -iE "x-vercel-cache|x-nextjs-prerender|age:"
```

**Proven output.**
```
HOME   : x-nextjs-prerender: 1   x-vercel-cache: HIT   (later STALE as age > 1h)
SITEMAP: (no prerender header)    x-vercel-cache: MISS  age: 0
```

**Decode.**
- `x-nextjs-prerender: 1` → the page was rendered at **build time** to static HTML.
- `x-vercel-cache: HIT` → served from Vercel's **edge cache**; no function ran.
- `HIT → STALE → HIT`: when `age` passed the **1h** revalidate window, the copy went
  `STALE`. Vercel serves the stale copy **instantly** while regenerating fresh HTML
  in the background — **stale-while-revalidate**. Reload twice and watch `age` reset.
- The sitemap is `ƒ` (no prerender header, `MISS`, `age: 0`) — computed every request.

**Why it matters.** `○` pages cost ~$0 and are globally instant; `ƒ` pages run code
every time. At high traffic, that's surviving a spike on cache vs melting the origin.

---

## Station 2 — Partial Prerendering (PPR), the `◐`

**What it is.** *One page* that is **both** static and dynamic: a static shell ships
instantly, then dynamic parts **stream** in inside `<Suspense>`. Flagship Next 16
feature (why `cacheComponents: true` is on). Routes: `/campaign`, `/news`,
`/blog/[slug]`.

**Where in code.** `src/app/(marketing)/campaign/page.tsx`:
```tsx
export default function CampaignPage({ searchParams }) {   // NOT async → static shell
  return (
    <Suspense fallback={<div className="… animate-pulse …" />}>
      <CampaignHero />          // async, reads cookies() → dynamic, streamed
    </Suspense>
    <Suspense fallback={<div className="… animate-pulse …" />}>
      <CampaignLead searchParams={searchParams} />  // reads searchParams → dynamic
    </Suspense>
  );
}
```
**The rule:** request-time APIs (`cookies()`, `searchParams`) **must** live inside a
`<Suspense>` boundary. That requirement is *why* the route is `◐` and not `○`.

**See it (`curl`).** The skeleton fallbacks are baked into the static shell; React's
streaming markers swap in the real content.
```bash
URL=https://nr-next-marketing.vercel.app/campaign
curl -s  "$URL" | grep -oE 'animate-pulse' | wc -l          # → skeletons in the shell
curl -s  "$URL" | grep -oE '<template id="B:[01]">'         # boundary placeholders
curl -s  "$URL" | grep -oE '\$RC\("B:[01]","S:[01]"\)'      # the swap script
curl -s -o /dev/null -w "ttfb %{time_starttransfer}s total %{time_total}s\n" "$URL"
```
**Proven output.**
```
animate-pulse skeletons in shell: 4
<template id="B:0">   <template id="B:1">
$RC("B:0","S:0")      $RC("B:1","S:1")
ttfb 0.083s  total 0.112s
```

**Decode.** `B:n` = boundary where the skeleton shows; `S:n` = the streamed real
content (parked in a hidden `<template>` at the end); `$RC(...)` = React's
*Replace-Children* inline script that swaps them. The gap between shell and swap was
**~28 ms** — far below one 60fps frame, so you never *see* the skeleton.

**"Why don't I see the skeleton?"** Because your dynamic holes (`cookies()`,
`searchParams`) resolve instantly — there's no latency to fill. To *see* it, add
artificial latency and the skeleton becomes visible for that duration:
```tsx
async function CampaignHero() {
  await new Promise((r) => setTimeout(r, 2000)); // TEMP demo only — remove after
  …
}
```
```
TTFB (skeleton paints): 0.063s
total (hero streams in): 2.047s   ← skeleton visible for ~2s, then swaps
```
The lead form (no delay) appears immediately — proving each Suspense boundary
streams **independently**.

---

## Station 3 — Edge A/B testing (`src/proxy.ts`)

**What it is.** Next 16 renamed `middleware.ts` → **`proxy.ts`**. It runs **at the
edge** (before the page) on `/campaign` and assigns an A/B variant with **no
flicker**.

**Where in code.** `src/proxy.ts` + `src/lib/flags.ts`:
```ts
// proxy.ts — runs at the edge before the page
request.cookies.set(exp.cookie, variant);          // THIS render sees the variant
const response = NextResponse.next({ request });
if (!existing) response.cookies.set(exp.cookie, variant, { maxAge: 60*60*24*30 });
export const config = { matcher: ["/campaign"] };
```
```ts
// flags.ts — variants live with the experiment (one source of truth)
A: { headline: "Launch your campaign in minutes", cta: "Start free" },
B: { headline: "Ship landing pages without engineering", cta: "Get a demo" },
```

**See it (`curl`).** Force each bucket via the cookie; see the proxy assign + pin one
when none is sent.
```bash
URL=https://nr-next-marketing.vercel.app/campaign
curl -s --cookie "ab-hero-cta=A" "$URL" | grep -oE "Launch your campaign in minutes|Start free"
curl -s --cookie "ab-hero-cta=B" "$URL" | grep -oE "Ship landing pages without engineering|Get a demo"
curl -sI "$URL" | grep -i "set-cookie"
```
**Proven output.**
```
A → "Launch your campaign in minutes" / "Start free"
B → "Ship landing pages without engineering" / "Get a demo"
no cookie → set-cookie: ab-hero-cta=A; Max-Age=2592000; SameSite=lax   (pinned 30 days)
```

**See it (Browser).** Incognito → `/campaign` → DevTools → Application → Cookies →
`ab-hero-cta`. Edit the value `A`⇄`B`, reload → the hero headline + CTA flip.

**Decode (the no-flicker trick).** The proxy writes the variant onto **this
request's** cookies *and* the response. So the page's `await cookies()` reads the
variant on the **same render** — the first paint is already the right variant. No
A-then-B swap, no CLS. Classic client-side A/B tools flash the default then swap
(hurts CWV); deciding at the edge avoids that entirely.

---

## Station 4 — Cache Components: `use cache` + on-demand revalidation

**What it is.** With Cache Components ON, caching is **opt-in**: mark a function
`"use cache"`, give it a lifetime (`cacheLife`) and a tag (`cacheTag`) for targeted
invalidation. The Revalidate/Expire columns in the route table come from these.

**Where in code.**
```ts
// src/lib/remote.ts — cached BFF data, tagged "todos"
async function getRemoteTodos() {
  "use cache";
  cacheLife("hours");
  cacheTag("todos");
  …
}
```
```ts
// src/app/api/revalidate/route.ts — WEBHOOK-STYLE on-demand bust (the CMS pattern)
if (secret !== apiConfig.webhookSecret) return Response.json({…}, { status: 401 });
revalidateTag(tag, "max");   // Next 16 two-arg form; "max" = stale-while-revalidate
```

**See it live (`curl`) — publish → watch the cache bust.**
```bash
URL=https://nr-next-marketing.vercel.app
curl -sI "$URL/api/todos" | grep -iE "x-vercel-cache|age:"          # baseline → HIT
curl -s -X POST "$URL/api/revalidate?secret=YOUR_SECRET&tag=todos"  # the webhook
curl -sI "$URL/api/todos" | grep -iE "x-vercel-cache|age:"          # → STALE (busted)
```
**Proven output.**
```
baseline                : x-vercel-cache: HIT
POST /api/revalidate     : {"revalidated":true,"tag":"todos"}
after                    : x-vercel-cache: STALE    (refetch triggered)
wrong secret             : HTTP 401 {"revalidated":false,"error":"invalid secret"}
```

**See it (Browser).** Open `/deals` and reload over ~90s. It prints a `generatedAt`
timestamp via `use cache` + `cacheLife({ revalidate: 60 })`; the value freezes, then
jumps after ~60s — time-based revalidation you can *watch*.

**The big idea.** Time-based revalidation is the *floor*; on-demand tag busting is the
*push*. A CMS publish POSTs the webhook → `revalidateTag` invalidates exactly the
tagged data → the next visitor gets fresh content in **seconds**, no rebuild/redeploy.
Static-page speed **and** CMS-instant freshness.

> ⚠️ **Security.** The webhook secret defaults to `"dev-secret"` in `env.ts`
> (`REVALIDATE_SECRET ?? "dev-secret"`). In production, **set `REVALIDATE_SECRET`** in
> Vercel (Settings → Environment Variables) so randoms can't bust your cache. The same
> secret also gates `/api/preview` (Draft Mode) — rotating it secures **both**.
> Env-var changes only apply to a **new deployment**.

---

## Station 5 — Server Actions: mutations with no API route

**What it is.** A `"use server"` function called **directly from a `<form>`** — no
REST endpoint you write, no `fetch`, validated on the server. React 19 primitive.

**Where in code (the islands pattern).**
```
subscribe/page.tsx   → STATIC shell (0 JS)
subscribe-form.tsx   → CLIENT island ("use client") — the only hydrated JS
actions.ts           → SERVER action ("use server") — never ships to the browser
```
```tsx
// subscribe-form.tsx
const [state, formAction] = useActionState(subscribe, initialState);
return <form action={formAction}> … </form>;   // submit POSTs to the route itself
const { pending } = useFormStatus();            // button shows "Subscribing…"
```
```ts
// actions.ts
"use server";
export async function subscribe(_prev, formData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))     // validate on the SERVER
    return { ok: false, message: "Please enter a valid email address." };
  …
}
```

**See it (Browser).** `/subscribe` → Network tab → submit. You'll see a **POST to
`/subscribe`** (the page's own URL, **not** `/api/...`) with a **`Next-Action`**
request header (the action's id). The success message renders inline.

**Proven output.** `POST https://nr-next-marketing.vercel.app/subscribe`

**Decode.** React serializes the form data, POSTs it to the route, Next dispatches it
to the `subscribe` function by its `Next-Action` id, and streams back the returned
`state` for `useActionState` to render. **Progressive enhancement:** because it's a
real `<form action>`, it works even before JS hydrates. `aria-live="polite"` announces
the result to screen readers.

---

## Station 6 — SEO as code

**What it is.** robots, sitemap, OG image, and per-page metadata are all **generated
by code** from one source of truth (`src/lib/site.ts`).

**Where in code.** `src/app/robots.ts`, `sitemap.ts`, `opengraph-image.tsx`, and
`generateMetadata` per route.

**See it (`curl`).**
```bash
URL=https://nr-next-marketing.vercel.app
curl -s "$URL/robots.txt"
curl -s "$URL/sitemap.xml" | grep -c "<loc>"
curl -sI "$URL/opengraph-image" | grep -i content-type
curl -s "$URL/blog/why-nextjs-for-marketing-sites" | grep -oE '<meta property="og:type"[^>]*>'
```
**Proven output.**
```
robots.txt  → Host + Sitemap: https://nr-next-marketing.vercel.app/...
sitemap.xml → 10 <loc> entries (7 static pages + 3 blog posts)
opengraph-image → content-type: image/png   (1200×630, rendered by next/og)
blog post → <meta property="og:type" content="article"/>  + article:published_time
```

**Decode.** `metadataBase` makes every relative URL **absolute** — which is why
fixing `siteConfig.url` **once** corrected the canonical, `og:url`, `og:image`,
sitemap, and robots all at once. The blog post declares `og:type="article"` while the
home page is a website — **per-route** metadata, not a global template. The
`og:image?<hash>` query is content-based cache-busting so social platforms refetch.

---

## Station 7 — The CMS boundary: zod + fixtures + Draft Mode

**What it is.** Untrusted CMS data is validated with **zod** at the boundary, with
**fixtures** as fallback (the app runs with zero API keys), and **Draft Mode** powers
unpublished-content preview.

**Where in code.** `src/lib/cms/schema.ts` (zod), `src/lib/cms/contentful.ts`
(env-gated source + draft-aware loader), `src/app/api/preview/*` (toggle Draft Mode).
```ts
// contentful.ts — draft-aware, cached loader
export async function getLandingPage() {
  "use cache";
  cacheLife("hours");
  cacheTag("cms");
  const { isEnabled: preview } = await draftMode();   // readable inside use cache
  const raw  = await queryContentful("ship-faster", preview);  // fixtures if no tokens
  const page = validate(landingPageSchema, mapLandingPage(raw), …);  // zod safeParse
  return { page, preview };
}
```

**See it (`curl`).**
```bash
URL=https://nr-next-marketing.vercel.app
curl -s "$URL/landing" | grep -oE '<h1[^>]*>[^<]+</h1>' | head -1   # from fixtures
curl -s -o /dev/null -w "%{http_code}\n" "$URL/api/preview?secret=WRONG&redirect=/landing"
```
**Proven output.**
```
landing H1 → "Ship marketing pages faster"   (Contentful fixtures; no CMS tokens set)
/api/preview wrong secret → 401
```

**Decode.**
- **Validate then trust:** `schema.ts` is a discriminated union of content blocks
  (`hero | featureList | cta | richText`). After one `safeParse` at the boundary, the
  app uses a fully-typed `LandingPage` (`z.infer`) — static type and runtime shape
  can't drift.
- **Graceful fallback:** no `CONTENTFUL_*` env → fixtures. Same resilience pattern as
  the Marketo lead form.
- **Draft Mode:** `getLandingPage()` reads `draftMode().isEnabled` *inside* `use
  cache` (a Next-16 allowance) → serves draft vs published. `/api/preview` flips the
  cookie behind the shared secret (so rotating `REVALIDATE_SECRET` secures preview too).

---

## Debugging war stories (real fixes made in this app)

These are great learning artifacts — symptom → root cause → fix.

### A. Production rendered in **Times** (serif) instead of Geist
- **Symptom.** Body font fell back to the browser-default serif on the live site.
- **Root cause.** `globals.css` declared `--font-sans` twice: once correctly in
  `@theme` (`var(--font-geist-sans)`) and again in `@theme inline` as
  `var(--font-sans)` — a **self-referential CSS variable cycle**. Per spec a cyclic
  custom property computes to the *guaranteed-invalid value*, which made
  `body { font-family: var(--font-sans), … }` an **invalid declaration** → browser
  default serif (Times). (Note: a mere font *load failure* would fall back to `Arial`,
  not Times — Times means the whole declaration was invalid.)
- **Fix.** Remove the self-reference; keep a single `--font-sans: var(--font-geist-sans)`
  source. Verify in built CSS:
  ```bash
  grep -o "\-\-font-sans:[^;]*;" .next/static/chunks/*.css
  # before: --font-sans:var(--font-sans);        ← cycle
  # after : --font-sans:var(--font-geist-sans);  ← fixed
  ```

### B. "Exit preview" button did nothing
- **Symptom.** Clicking *Exit preview* on `/landing` left the Draft Mode banner up.
- **Root cause.** It was a **`<Link>`** (client-side *soft* navigation) to the
  `/api/preview/disable` Route Handler. Draft Mode can only be toggled in a Route
  Handler/Server Action and needs a **hard** navigation so the `Set-Cookie`
  (clearing `__prerender_bypass`) reaches the browser and forces a fresh render. With
  `<Link>`, the App Router **Router Cache** re-served the `preview=true` payload.
- **Fix.** Use a plain `<a href="/api/preview/disable">` (full GET navigation).
  *Entering* preview always worked because it's reached via a direct URL from the CMS
  — already a hard navigation.

---

## Try-it-yourself checklist
- [ ] Reload `/` until `x-vercel-cache` flips `STALE → HIT` and `age` resets (Station 1).
- [ ] `curl` `/campaign` and find the `$RC("B:0","S:0")` swap markers (Station 2).
- [ ] Edit the `ab-hero-cta` cookie `A`⇄`B` and watch the hero change (Station 3).
- [ ] POST `/api/revalidate` with your secret and watch `/api/todos` go `STALE` (Station 4).
- [ ] Submit `/subscribe` and confirm the POST targets `/subscribe`, not `/api/*` (Station 5).
- [ ] `curl` `/sitemap.xml` and count the `<loc>` entries (Station 6).
- [ ] Enter Draft Mode, then click *Exit preview* and watch `__prerender_bypass` delete (Station 7).

## The throughline
You choose, **per component**, between cached-and-instant vs dynamic-and-fresh, and
the framework handles the streaming, caching, invalidation, and edge execution. A
marketing site can be **as fast as static** and **as fresh as a CMS** at the same
time — the core argument for Next.js on high-traffic marketing sites.

## Related docs
- `docs/study_plan.md` — the day-by-day study tracker.
- `docs/day02_nextjs_rendering.md`, `day03_nextjs_data_caching.md` — rendering & caching depth.
- `docs/day10_seo.md` — SEO as code (Station 6).
- `docs/day11_contentful_cms.md`, `day12_marketing_integrations.md` — CMS, A/B, UTM.
- `docs/deployment_vercel.md` — deploy + env vars.
</content>
</invoke>
