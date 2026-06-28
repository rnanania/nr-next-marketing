# Day 9 — Core Web Vitals & Performance

> Target: Next **16.2**, the Day 1–8 site. Build task: **measure & improve CWV;
> cut a render-blocking script.** Theme: ship less, ship it in the right order, and
> never shift the layout. Core Web Vitals are a Google ranking factor *and* a UX
> signal — directly relevant to a marketing site.

## Recap
| Metric | Measures | Good (p75) | Worst offenders |
|---|---|---|---|
| **LCP** Largest Contentful Paint | when the biggest above-the-fold element renders | **≤ 2.5s** | unoptimized hero image, render-blocking JS/CSS, slow TTFB |
| **CLS** Cumulative Layout Shift | visual stability (unexpected movement) | **≤ 0.1** | images without dimensions, web fonts (FOUT), injected banners/ads |
| **INP** Interaction to Next Paint | responsiveness to clicks/taps/keys | **≤ 200ms** | heavy JS on the main thread, big re-renders, long tasks |
| **FCP** First Contentful Paint | first pixel of content | ≤ 1.8s | render-blocking resources, slow server |
| **TTFB** Time To First Byte | server/network response time | ≤ 0.8s | slow origin, no caching/CDN, cold serverless |

### Abbreviations
| Short | Full form |
|---|---|
| **CWV** | Core Web Vitals |
| **RUM** | Real User Monitoring (field data) |
| **CrUX** | Chrome User Experience Report (field data) |
| **FOUT/FOIT** | Flash Of Unstyled / Invisible Text (font swap) |
| **RSC** | React Server Components |
| **BFF/CDN** | Backend-for-Frontend / Content Delivery Network |

---

## 1. The metrics & how to drive them up

The interview answer to *"how do you drive CWV up?"* is per-metric:
- **LCP** → optimize the hero (next/image + `priority`), cut render-blocking JS/CSS,
  fast TTFB (static/ISR + CDN), preconnect to critical origins.
- **CLS** → always reserve space: image `width`/`height`, font `size-adjust`,
  skeletons for async/lazy content, never insert content above existing content.
- **INP** → ship less JS (RSC), code-split, defer third-party scripts, keep
  interactions cheap (Day 4: compiler memoization, `useDeferredValue`/`useTransition`).

---

## 2. Images — `next/image` (the biggest LCP + CLS lever)

Images are usually the LCP element and a top CLS cause. `next/image` fixes both:

```tsx
import Image from "next/image";
import hero from "@/images/hero.jpg";   // static import → build knows dimensions

<Image
  src={hero}
  alt="…"
  priority                               // preload + eager (this is the LCP element)
  placeholder="blur"                     // tiny blurred preview while it loads
  sizes="(min-width: 1024px) 50vw, 100vw" // download the right srcset candidate
/>
```

What it buys you (all proven below):
- **CLS = 0**: static import gives Next the intrinsic `width`/`height`, so it reserves
  the box before the image loads — no shift.
- **LCP**: `priority` emits a `<link rel="preload" as="image">` and renders eager
  (no `loading="lazy"`), so the hero starts downloading immediately.
- **Smaller bytes**: automatic **AVIF → WebP** negotiation + a responsive `srcset`
  so phones don't download the 1600px file.
- **Lazy by default**: every *non-priority* image is `loading="lazy"` automatically.

---

## 3. Fonts — `next/font` (FCP + CLS)

`next/font/google` self-hosts the font at build (no request to Google, no extra
round-trip) and emits `font-display: swap` + a `size-adjust` `@font-face` descriptor
so the fallback font occupies the *same space* as the web font — eliminating the
font-swap layout shift (FOUT-induced CLS). It's already wired in `layout.tsx`
(`Geist`/`Geist_Mono`).

---

## 4. JavaScript — measure, split, and ship less

**Measure** with the bundle analyzer (`ANALYZE=true npm run build` → treemap):
```ts
// next.config.ts
const withAnalyzer = withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" });
export default withAnalyzer(nextConfig);
```

**Ship less JS three ways:**
1. **RSC** — Server Components ship *zero* JS for themselves; keep `"use client"`
   islands small (Day 1). Most of this site is server-rendered.
2. **Route-level splitting** (automatic) — a route only loads its own JS. The form's
   react-hook-form + zod chunk loads on `/design-system`, never on `/`.
3. **`dynamic()` / lazy-loading** — defer heavy, below-the-fold, or interaction-gated
   code so it's off the critical path:
   ```tsx
   // client wrapper — ssr:false keeps the chunk off the server render + initial load
   const ContactForm = dynamic(() => import("@/components/contact-form"), {
     ssr: false,
     loading: () => <Skeleton />,   // reserve space → no CLS
   });
   ```

---

## 5. Third-party scripts — `next/script` (cut render-blocking)

A naive `<script src>` in `<head>` is **render-blocking** — it delays FCP/LCP.
`next/script` loads it without blocking, controlled by `strategy`:

| strategy | When it loads | Use for |
|---|---|---|
| `beforeInteractive` | before hydration | rare — consent/polyfills that must run first |
| `afterInteractive` (default) | after the page is interactive | analytics, GTM |
| `lazyOnload` | during browser idle | chat widgets, non-essential embeds |

```tsx
// analytics that never blocks the critical render
<Script id="analytics-init" strategy="afterInteractive">{`/* gtag init */`}</Script>
```

---

## 6. Caching, CDN & edge (TTFB + LCP)

Fast bytes start with the network: serve **static/ISR** HTML from a **CDN/edge**
(Days 2–3) so TTFB is low and the document arrives fast everywhere. Add
`preconnect`/`dns-prefetch` for critical third-party origins, cache immutable assets
(`/_next/static`) forever, and keep dynamic work in small streamed holes (PPR) so the
static shell still hits the CDN.

---

## 7. Lab vs field data

| | Lab (synthetic) | Field (real users) |
|---|---|---|
| Tools | **Lighthouse**, WebPageTest, DevTools | **CrUX**, RUM (`web-vitals`, Vercel Analytics) |
| INP | estimated/limited | **measured for real** (INP needs real interactions) |
| Use | debug & catch regressions in CI | the score Google actually ranks on (p75) |

Optimize against **both**: Lighthouse in CI to catch regressions, CrUX/RUM to see
what real users (and Google) experience. Lab ≠ field — a green Lighthouse can still
have poor field INP.

---

## Build Exercise — ✅ BUILT & RUNNING

Added to the Day 1–8 project (`nr-next-marketing/`):

| Concept | Where |
|---|---|
| `next/image` LCP hero (priority, blur, responsive, AVIF/WebP) | `src/app/(marketing)/page.tsx` + `src/images/hero.jpg` |
| AVIF/WebP format config | `next.config.ts` (`images.formats`) |
| `next/script` non-blocking analytics (afterInteractive) | `src/app/layout.tsx` |
| `dynamic()` lazy-loaded form (ssr:false + skeleton) | `src/components/lazy-contact-form.tsx`, used in `design-system` |
| Bundle analyzer (`ANALYZE=true`) | `next.config.ts` |

Run it:
```bash
cd nr-next-marketing
npm run dev                 # http://localhost:3000  (hero image, lazy form)
ANALYZE=true npm run build  # emits the bundle treemap
```

---

## Hands-On Walkthrough — Day 9 Proven in This Project

### A. `next/image` optimizes the LCP hero
Served `/` HTML for the hero `<img>`:
```
width="1600" height="1000"                 ← reserves space → CLS = 0
decoding="async"                            ← off main thread
sizes="(min-width:1024px) 50vw, 100vw"     ← right candidate per breakpoint
srcSet="/_next/image?...&w=384&q=75, ...640, ...750, ...828, ..."  ← responsive
/_next/image references: 19                 ← AVIF/WebP negotiation pipeline
no loading="lazy" on the hero               ← eager (it's the LCP element)
<link rel="preload" as="image" …>           ← priority preload emitted
```
(Source `hero.jpg` is 22 KB; the browser actually gets a smaller AVIF/WebP sized to its
viewport.) **What this proves:** the hero loads early, in a modern format, at the right
size, with zero layout shift.

### B. Fonts don't shift the layout
```
font-display: swap in CSS  : 11
size-adjust descriptor     : 3
```
**What this proves:** `next/font` self-hosts with `swap` + `size-adjust`, so the
fallback occupies the same space as Geist — no font-swap CLS.

### C. The heavy form is code-split AND lazy-loaded
```
react-hook-form chunk is its own file (~316 KB)        ← split out
home (/) references that chunk: 0                        ← route-level split
design-system SSR contains the form ("Send message"): 0 ← not server-rendered
design-system SSR contains the skeleton: 1              ← space reserved (no CLS)
form chunk preloaded on design-system: 0                ← loaded on-demand after hydration
```
**What this proves:** react-hook-form + zod never ship on pages that don't use the form,
and even on `/design-system` they load *after* hydration off the critical path — the
initial render isn't paying for them.

### D. Third-party script is non-blocking
```
analytics script present, strategy=afterInteractive (runs after interactive, in <body>)
```
**What this proves:** analytics doesn't block FCP/LCP — the opposite of a `<script>` in
`<head>`.

### Try-it-yourself experiments
1. **See the format negotiation:** DevTools → Network → load `/` → the hero request is
   `/_next/image?...` returning `image/avif` (or webp), far smaller than 22 KB and sized
   to your viewport.
2. **Prove CLS = 0:** throttle to Slow 3G and reload `/` → the hero's box is reserved
   (blurred placeholder), nothing jumps when the image arrives.
3. **Watch the lazy chunk:** Network tab on `/design-system` → the react-hook-form chunk
   downloads *after* the page is interactive (the skeleton shows first).
4. **Analyze the bundle:** `ANALYZE=true npm run build` → treemap shows what's shipping
   JS and where to split next.
5. **Lighthouse:** run it on `/` (DevTools → Lighthouse) for the lab CWV scores; compare
   to field data in CrUX once deployed.

---

## Self-Check Questions & Answers

**1. How do you drive Core Web Vitals scores up?** *(direct JD line)*
Per metric. **LCP**: optimize the hero with `next/image` + `priority` (preload, modern
format, right size), cut render-blocking JS/CSS, and serve static/ISR HTML from a CDN for
low TTFB. **CLS**: reserve space for everything — image `width`/`height`, `size-adjust`
fonts, skeletons for lazy/async content, never inject content above the fold. **INP**:
ship less JS (RSC + code-splitting + deferring third-party scripts) and keep interactions
cheap. Then measure with Lighthouse in CI and CrUX/RUM in the field, and fix the worst
metric first.

**2. What does each Core Web Vital measure and what's a good score?**
LCP (≤2.5s) — when the largest above-the-fold element renders (loading). CLS (≤0.1) —
how much the layout shifts unexpectedly (visual stability). INP (≤200ms) — how quickly
the page responds to interactions (responsiveness; it replaced FID). Supporting: FCP
(first content) and TTFB (server response). Thresholds are the **p75** across real users.

**3. How does `next/image` help performance?**
It serves modern formats (AVIF/WebP) via content negotiation, generates a responsive
`srcset` so devices download an appropriately-sized image, lazy-loads off-screen images
by default, and — with a static import — knows the intrinsic dimensions so it reserves
space (CLS = 0). For the LCP image you add `priority` to preload it and skip lazy
loading, plus `placeholder="blur"` for a smooth load.

**4. How do you reduce the JavaScript a page ships?**
Default to Server Components (zero client JS for themselves) and keep `"use client"`
islands small; rely on automatic route-level code-splitting so a route only loads its own
JS; `dynamic()`-import heavy, below-the-fold, or interaction-gated components (with
`ssr:false` to keep them off the server render and initial load); defer third-party
scripts with `next/script`; and use the bundle analyzer to find what to split next. (Here
react-hook-form + zod load only on the form's route, after hydration.)

**5. How do you load third-party scripts without hurting performance?**
With `next/script` and the right `strategy`: `afterInteractive` (default) for analytics/
GTM so they run after the page is interactive, `lazyOnload` for non-essential widgets
(chat) during idle, and `beforeInteractive` only for the rare script that must run before
hydration. This avoids the render-blocking `<script>`-in-`<head>` that delays FCP/LCP, and
isolates third-party main-thread cost that would otherwise wreck INP.

**6. What causes CLS and how do you prevent it?**
Content that moves after it's already painted: images without dimensions, web fonts
swapping to a differently-sized face, and content injected above existing content (ads,
banners, async widgets). Prevent it by reserving space: `width`/`height` (or aspect-ratio)
on media, `next/font` with `size-adjust`, skeletons sized to the final content for
lazy/streamed sections, and never inserting layout above the current viewport.

**7. Lab vs field data — why both?**
Lab (Lighthouse/WebPageTest) is synthetic and reproducible — great for debugging and CI
regression gates, but it's one simulated run and can't really measure INP (no real
interactions). Field (CrUX/RUM) is what actual users experience at the p75 and is what
Google ranks on. A page can be green in Lighthouse and still fail field INP, so you use
lab to catch regressions and field to know the truth.

---

## Interview Soundbites (tie to your NBA.com / JPMC work)
- *"I drive CWV per metric: `next/image` + `priority` and a CDN-served static shell for
  LCP, reserved space (image dims, `size-adjust` fonts, skeletons) for CLS, and shipping
  less JS — RSC plus code-splitting — for INP."*
- *"The hero is the LCP element, so it's a priority `next/image`: preloaded, AVIF/WebP,
  responsive `srcset`, and statically imported so its box is reserved — zero layout shift."*
- *"Heavy client libs like a form's react-hook-form + zod are dynamically imported with a
  skeleton, so they load after hydration on just the route that needs them, not in the
  initial bundle."*
- *"Third-party scripts go through `next/script` with `afterInteractive`/`lazyOnload` so
  analytics and widgets never block the render — and I watch field INP in CrUX, not just
  Lighthouse, because lab and field diverge."*
