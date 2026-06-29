# Analytics Stack — Full Reference

> The complete measurement setup for this Next.js 16 marketing site: **three
> complementary layers**, each doing one job. GTM for the marketing tag ecosystem,
> Vercel Web Analytics for traffic, Vercel Speed Insights for real-user performance.
> Deep-dive on GTM lives in [`gtm_integration.md`](gtm_integration.md); concepts in
> [`day12_marketing_integrations.md`](day12_marketing_integrations.md).

## The three layers (and why all three)

They are **not** redundant — they answer different questions and sit at different
layers of the stack.

| Layer | Answers | Package / API | Cookies? | Consent gate? |
|---|---|---|---|---|
| **Google Tag Manager** | *What marketing tags fire?* (GA4, ad pixels, conversions) | hand-rolled `dataLayer` + `next/script` | Yes (tags set them) | **Yes** — hard-gated |
| **Vercel Web Analytics** | *Who / how many?* (visitors, page views, bounce, referrers) | `@vercel/analytics` → `<Analytics/>` | **No** (cookieless) | No |
| **Vercel Speed Insights** | *How fast for real users?* (LCP/CLS/INP/FCP/TTFB) | `@vercel/speed-insights` → `<SpeedInsights/>` | **No** (cookieless) | No |

Key design point: **only GTM touches cookies**, so only GTM is consent-gated. The
two Vercel layers are first-party and cookieless, so they run **unconditionally** —
performance and traffic data are never hostage to whether a user accepts the banner.

```
                       ┌──────────────────────── app/layout.tsx ───────────────────────┐
                       │                                                                │
  consent-gated  ──────┼─▶ <GoogleTagManager/>  ─▶ window.dataLayer ─▶ GTM ─▶ GA4/Ads   │
                       │   <AnalyticsPageViews/> ─▶ (page_view events)                  │
                       │                                                                │
  always-on  ──────────┼─▶ <Analytics/>      ─▶ Vercel Web Analytics  (traffic)         │
  (cookieless)         │   <SpeedInsights/>  ─▶ Vercel Speed Insights (Core Web Vitals) │
                       └────────────────────────────────────────────────────────────────┘
```

## Layer 1 — Google Tag Manager (consent-gated)

The orchestration layer for marketing tags. The app pushes vendor-agnostic events
onto `window.dataLayer`; GTM (loaded only after consent) reads them and fires tags
configured in its UI — no redeploy for tag changes.

- **Loader:** `src/components/google-tag-manager.tsx` — injects `gtm.js` via
  `next/script strategy="afterInteractive"`, only when `consent === "granted"`, with
  a correct Consent Mode v2 handshake (`default denied → update granted → load`).
- **Events:** `src/lib/analytics.ts` `track()` pushes `{event, …}`; SPA `page_view`
  comes from `src/components/analytics-page-views.tsx`.
- **Consent:** captured by `src/components/cookie-consent.tsx`, withdrawable via
  `src/components/cookie-settings-button.tsx` (footer).
- **Config:** `NEXT_PUBLIC_GTM_ID` (falls back to `GTM-DEMO123`).

Full walkthrough + architecture diagram: **[`gtm_integration.md`](gtm_integration.md)**.

## Layer 2 — Vercel Web Analytics (cookieless traffic)

First-party visitor and page-view analytics. Cookieless and GDPR-friendly, so no
consent banner is required.

```tsx
// src/app/layout.tsx
import { Analytics } from "@vercel/analytics/next";
// …
<Analytics />   // mounted unconditionally, next to the consent-gated GTM
```

- The `/next` entry **auto-tracks App Router route changes** — no manual page-view
  wiring (that's only needed for GTM, which doesn't know about client navigation).
- **First-party** (served from your domain) → far more adblock-resistant than GTM/GA.
- The beacon **only reports on Vercel**; it's a no-op in local dev.
- Enabled in the Vercel dashboard under **Analytics**.

## Layer 3 — Vercel Speed Insights (real-user CWV)

Real User Monitoring for Core Web Vitals — the field data behind Day 9's performance
work and the JD's "drive Core Web Vitals" line.

```tsx
// src/app/layout.tsx
import { SpeedInsights } from "@vercel/speed-insights/next";
// …
<SpeedInsights />
```

- Reports **LCP, CLS, INP, FCP, TTFB** from real visitors, scored per route/device.
- Cookieless → no consent gate; mounted unconditionally.
- Lab (Lighthouse) vs **field** (this) — Speed Insights is the real-world signal.
- Must be **Enabled** on the Speed Insights card in the Vercel dashboard, then deployed.

## Consent model (who runs when)

```
                    ┌─────────────┬──────────────────┬───────────────────┐
                    │ GTM         │ Web Analytics    │ Speed Insights    │
  ──────────────────┼─────────────┼──────────────────┼───────────────────┤
  Before any choice │   ✗ off     │   ✓ running      │   ✓ running       │
  Consent: granted  │   ✓ loads   │   ✓ running      │   ✓ running       │
  Consent: denied   │   ✗ off     │   ✓ running      │   ✓ running       │
  Withdrawn later   │ stops*      │   ✓ running      │   ✓ running       │
                    └─────────────┴──────────────────┴───────────────────┘
  * already-injected GTM scripts can't be unloaded without a reload; we signal
    Consent Mode `denied` to halt further collection. See gtm_integration.md.
```

## Install & wiring summary

```bash
npm i @vercel/analytics @vercel/speed-insights   # GTM is hand-rolled, no package
```

```tsx
// src/app/layout.tsx (body, after the page content)
<GoogleTagManager />                       {/* Layer 1 — consent-gated */}
<Suspense fallback={null}>
  <AnalyticsPageViews />                    {/* Layer 1 — SPA page_view (useSearchParams) */}
</Suspense>
<CookieConsent />                          {/* consent banner */}
<Analytics />                              {/* Layer 2 — cookieless */}
<SpeedInsights />                          {/* Layer 3 — cookieless */}
```

| Env var | Layer | Default |
|---|---|---|
| `NEXT_PUBLIC_GTM_ID` | GTM | `GTM-DEMO123` (fake; events still land in `dataLayer`) |
| *(none)* | Vercel Analytics / Speed Insights | auto on Vercel once enabled in dashboard |

## Verification (honest)

- `npm run typecheck` / `npm run lint` / `npm run build` — all pass; `/` stays `○`
  static (the `<Suspense>` around `useSearchParams` keeps the prerender).
- `npm run start` + `curl` — GTM's `gtm.js` is **absent** from pre-consent HTML
  (gated); consent banner present.
- **Not provable locally** (no headless browser; client-injected; Vercel-only):
  - GTM-after-grant, the footer button, and `page_view` pushes → inspect
    `window.dataLayer` in DevTools after clicking **Accept**.
  - Web Analytics / Speed Insights beacons → only report on a real Vercel deploy;
    confirm in the Vercel **Analytics** and **Speed Insights** dashboards after
    deploying and browsing the live site.

## Seeing dataLayer events without a real GTM container

The `dataLayer` exists independently of GTM, so events are inspectable with no
container:

```js
window.dataLayer                 // full list of pushed events
// live watch (paste before navigating):
const _p = window.dataLayer.push.bind(window.dataLayer);
window.dataLayer.push = (...a) => { console.log('📊', ...a); return _p(...a); };
```

Or a dataLayer browser extension (dataslayer, Omnibug, Trackie). Note `page_view`
only fires once consent is **granted**.
