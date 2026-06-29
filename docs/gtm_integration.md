# GTM Integration — End to End

> How Google Tag Manager is wired into this Next.js 16 app: **non-blocking,
> consent-gated, SPA-aware, and GDPR-withdrawable**. This is the implementation
> reference; the conceptual write-up lives in
> [`day12_marketing_integrations.md`](day12_marketing_integrations.md). For how GTM
> sits alongside Vercel Web Analytics + Speed Insights, see
> [`analytics_stack.md`](analytics_stack.md).

## The mental model (read this first)

The app **never talks to GTM directly**. It pushes plain messages onto a global
array — `window.dataLayer` — and GTM (loaded separately) reads that array and
decides which tags to fire (GA4, Ads, pixels). The `dataLayer` is the **seam**:
the app stays vendor-agnostic, marketing reconfigures tags in the GTM UI without a
deploy.

```
  app code                dataLayer (window)              GTM container
  ────────                ──────────────────              ─────────────
  track("page_view") ──▶  [{event:"page_view",…}]  ──▶  trigger ▶ GA4 tag
  setConsent()       ──▶  ["consent","update",{…}] ──▶  Consent Mode gates tags
```

Two **different shapes** ride on the same array — don't mix them up:

| Purpose | Shape | Pushed by |
|---|---|---|
| App **events** (trigger tags) | `{ event: "page_view", … }` | `track()` |
| **Consent Mode v2** signals | `["consent","update",{…}]` (`arguments`-shaped, via `gtag()`) | `consentUpdate()` / GTM loader |

Pushing a `{event:"consent_update"}` object does **not** drive Consent Mode — that's
a classic bug this integration deliberately avoids.

## Architecture

Everything left of the dotted line is **our code**, running in the browser. The
`dataLayer` is the boundary; everything right of it is **Google's**, loaded only
after consent. The `consentchange` event is the in-app bus that keeps every consent
reader in sync via `useSyncExternalStore`.

```
  BROWSER (our Next.js app)                            │  GOOGLE (loaded post-consent)
                                                       │
  ┌─────────────────────────────────────────────┐     │
  │ app/layout.tsx  (mounts the analytics stack) │     │
  │                                              │     │
  │  ┌────────────────────┐  reads consent       │     │
  │  │ CookieConsent      │◀───────────┐         │     │
  │  │ (banner)           │  setConsent│         │     │
  │  └─────────┬──────────┘            │         │     │
  │            │ Accept / Reject       │         │     │
  │            ▼                       │         │     │
  │  ┌────────────────────────────────┴──────┐  │     │
  │  │  src/lib/analytics.ts  (the seam)      │  │     │
  │  │  ┌──────────────┐   ┌───────────────┐  │  │     │
  │  │  │ consent store│   │  track()      │  │  │     │
  │  │  │ cookie +     │   │  gtag()       │  │  │     │
  │  │  │ consentchange│   └──────┬────────┘  │  │     │
  │  │  └──────┬───────┘          │           │  │     │
  │  └─────────┼──────────────────┼───────────┘  │     │
  │   subscribe│ (useSyncExternal)│ push         │     │
  │            │                  ▼              │     │
  │            │        ┌────────────────────┐  │     │     ┌──────────────────┐
  │            │        │ window.dataLayer[] │──┼──┼────────▶│  GTM container   │
  │            │        │  {event:…}         │  │  │     │   │  (gtm.js)        │
  │            │        │  ["consent",…]     │  │  │     │   │                  │
  │            │        └────────▲───────────┘  │  │     │   │  triggers ▶ tags │
  │            │                 │ push          │  │     │   └────────┬─────────┘
  │  ┌─────────┴────────┐  ┌─────┴───────────┐   │  │     │            │
  │  │ GoogleTagManager │  │ AnalyticsPage   │   │  │     │            ▼
  │  │ consent==granted │  │ Views: page_view│   │  │     │   ┌──────────────────┐
  │  │ → inject gtm.js ─┼──┼─ on <Link> nav  │   │  │     │   │ GA4 / Ads / pixel │
  │  └──────────────────┘  └─────────────────┘   │  │     │   └──────────────────┘
  │  ┌──────────────────┐                        │  │     │
  │  │ CookieSettings   │ resetConsent()         │  │     │   Consent Mode v2 gates
  │  │ (footer) ────────┼─▶ banner returns       │  │     │   whether tags store
  │  └──────────────────┘                        │  │     │   cookies / send data
  └──────────────────────────────────────────────┘     │
                                                       │
  Legend:  ──▶ data/control flow      │ = trust boundary (consent gate)
```

**Reading it:** consent is captured once (banner) → stored in `analytics.ts` →
every consent reader (`GoogleTagManager`, `AnalyticsPageViews`, `CookieSettings`)
re-renders via the `consentchange` bus. Only when `granted` does `GoogleTagManager`
inject `gtm.js`. From then on, app events (`track`, `page_view`) flow across the
`dataLayer` boundary into GTM, which fires tags — themselves gated by the Consent
Mode signals that crossed the same boundary.

## Files at a glance

| File | Role |
|---|---|
| `src/lib/analytics.ts` | The dataLayer + consent store. `track()`, `getConsent`/`setConsent`/`resetConsent`, `consentUpdate()`, the `gtag()` stub, subscription for `useSyncExternalStore`. |
| `src/components/cookie-consent.tsx` | The GDPR banner that captures the first Accept/Reject decision. |
| `src/components/google-tag-manager.tsx` | Injects the GTM snippet **only after consent**, with the Consent Mode handshake. |
| `src/components/analytics-page-views.tsx` | Pushes `page_view` on client-side route changes. |
| `src/components/cookie-settings-button.tsx` | Footer control to **withdraw** consent. |
| `src/app/layout.tsx` | Mounts GTM + page-view tracker (in `<Suspense>`) + banner. |
| `.env.example` | `NEXT_PUBLIC_GTM_ID` (falls back to `GTM-DEMO123`). |

---

## Step 1 — The dataLayer + a vendor-agnostic `track()`

`src/lib/analytics.ts` owns one global array and a tiny helper. SSR-guarded so it's
import-safe in any client component:

```ts
function dataLayer(): unknown[] {
  const w = window as Window & { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  return w.dataLayer;
}

// Event push — GTM triggers fire on the `event` name.
export function track(event: string, params = {}) {
  if (typeof window === "undefined") return;
  dataLayer().push({ event, ...params });
}
```

Anywhere in the app: `track("generate_lead", { form: "marketo" })`. The app names
*business events*; GTM decides what to do with them.

## Step 2 — Consent store (the privacy gate)

Nothing analytics-related runs until the user opts in. The decision lives in a
first-party cookie and is exposed as an **external store** so React components read
it reactively:

```ts
export function getConsent(): "granted" | "denied" | null {
  // parse the `cookie-consent` cookie → "granted" | "denied" | null (undecided)
}
export function setConsent(value) {
  document.cookie = `cookie-consent=${value};path=/;max-age=…;samesite=lax`;
  consentUpdate(value);                       // tell Consent Mode (if GTM is loaded)
  window.dispatchEvent(new Event("consentchange"));   // notify subscribers
}
export function subscribeConsent(cb) {
  window.addEventListener("consentchange", cb);
  return () => window.removeEventListener("consentchange", cb);
}
```

Components read it with `useSyncExternalStore(subscribeConsent, getConsent, () => null)`
— **not** `useEffect`+`setState`. The `() => null` server snapshot means "undecided"
during SSR, so the server never assumes consent.

## Step 3 — The consent banner

`cookie-consent.tsx` shows until a decision exists, then writes the cookie:

```tsx
const consent = useSyncExternalStore(subscribeConsent, getConsent, () => null);
if (consent !== null) return null;            // already decided → hide
// …Reject → setConsent("denied")   |   Accept → setConsent("granted")
```

## Step 4 — Load GTM (only after consent) with the Consent Mode handshake

`google-tag-manager.tsx` is the heart of it. It renders **nothing** until consent is
`granted`; then it injects the GTM snippet via `next/script`:

```tsx
const consent = useSyncExternalStore(subscribeConsent, getConsent, () => null);
if (consent !== "granted") return null;       // no GTM, no cookies, pre-consent

return (
  <Script id="gtm" strategy="afterInteractive">{`
    window.dataLayer=window.dataLayer||[];
    function gtag(){dataLayer.push(arguments);}
    gtag('consent','default',{ad_storage:'denied',analytics_storage:'denied',
                              ad_user_data:'denied',ad_personalization:'denied'});
    gtag('consent','update', {ad_storage:'granted',analytics_storage:'granted',
                              ad_user_data:'granted',ad_personalization:'granted'});
    (function(w,d,s,l,i){…standard GTM loader…})(window,document,'script','dataLayer','${GTM_ID}');
  `}</Script>
);
```

Why each piece matters:

- **`strategy="afterInteractive"`** — loads after hydration so GTM never blocks
  FCP/LCP (Core Web Vitals, Day 9).
- **Hard gate** (`consent !== "granted" → null`) — strictest privacy: GTM's JS and
  cookies don't exist at all until opt-in. Also a perf win for users who reject.
- **Consent Mode v2 handshake, in order** — `default: denied` **must** precede
  `update: granted`, and both must precede `gtm.js`. Because this component only
  mounts *after* a grant, putting all three in one inline snippet guarantees that
  ordering (vs. relying on separately-timed pushes that could land out of order).

## Step 5 — Track SPA page views

GTM's container fires a pageview **only on the initial hard load**. App Router
`<Link>` navigations never reload, so they'd go uncounted. `analytics-page-views.tsx`
fixes that:

```tsx
const pathname = usePathname();
const searchParams = useSearchParams();
const consent = useSyncExternalStore(subscribeConsent, getConsent, () => null);

useEffect(() => {
  if (consent !== "granted") return;
  track("page_view", { page_path: /* pathname + ?query */ });
}, [pathname, searchParams, consent]);

return null;                                   // renders nothing
```

- Firing analytics on navigation is a **real side effect**, so `useEffect` is
  correct here (this is *not* the effect-then-`setState` antipattern; and consent is
  still read via `useSyncExternalStore`).
- `useSearchParams()` is a request-time dynamic read, so in `layout.tsx` it's wrapped
  in **`<Suspense fallback={null}>`** — otherwise the static prerender of `/` bails.
- In GTM, add a **Custom Event** trigger on `page_view` to fire your GA4 page-view tag.

## Step 6 — Withdraw consent (GDPR)

Withdrawal must be as easy as granting. The footer's **"Cookie settings"** button
(`cookie-settings-button.tsx`) calls `resetConsent()`:

```ts
export function resetConsent() {
  document.cookie = `cookie-consent=;path=/;max-age=0;samesite=lax`;  // clear → banner returns
  consentUpdate("denied");                     // signal Consent Mode for loaded tags
  window.dispatchEvent(new Event("consentchange"));
}
```

Honest limit: a `<script>` already injected this session **can't be unloaded** without
a reload, so we stop further collection (`update → denied`) rather than force one. The
button itself only appears once a decision exists (`consent !== null`).

## Step 7 — Configure a real container

Everything above runs on the `GTM-DEMO123` fallback. To go live, set one env var:

```bash
# .env.local
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

Then in the **GTM web UI**: create a GA4 Configuration tag, add Custom Event triggers
for `page_view` / `generate_lead`, enable **Consent Mode** on tags, and publish the
container. No app redeploy needed for tag changes — that's the whole point of GTM.

> Why no `<noscript>` iframe? The textbook GTM install adds a `<noscript>` fallback
> for JS-disabled clients. We **omit** it on purpose: those clients can't run our
> consent UI either, so the iframe would load GTM **without consent**. Skipping it is
> the privacy-correct trade-off.

---

## End-to-end flow

```
1. First visit            → banner shows; dataLayer empty; no GTM, no cookies.
2. User clicks Accept     → cookie-consent=granted; "consentchange" fires.
3. useSyncExternalStore   → GoogleTagManager re-renders; injects the snippet.
4. Snippet runs           → gtag consent default(denied) → update(granted) → gtm.js loads.
5. Navigation (<Link>)    → AnalyticsPageViews pushes {event:"page_view", …}.
6. GTM trigger            → fires GA4 page-view / lead tags per its config.
7. User → "Cookie settings" → resetConsent(): cookie cleared, update(denied), banner returns.
```

## Verification (what's provable here, honestly)

- `npm run typecheck` / `npm run lint` / `npm run build` — all pass.
- Build route table: **`/` stays `○` static** — proves the `<Suspense>` around
  `useSearchParams` kept the page-view tracker from de-opting the prerender.
- `npm run start` + `curl localhost:3000` — GTM's `gtm.js` is **absent** from the
  pre-consent HTML (gated), and the consent banner is present.
- **Not provable via `curl`:** GTM-after-grant, the footer button, and the
  `page_view` pushes are all client-runtime behaviors gated behind `useSyncExternalStore`
  (server snapshot `null`), and there's no headless browser in this project. To see
  them: open the app, Accept, and watch `window.dataLayer` / the Network tab / GTM
  Preview mode.
