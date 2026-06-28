# Day 12 — Marketing Integrations & Experimentation

> Target: Next **16.2**. Build task: **GTM + a Marketo form + a flag-gated variant.**
> Theme: wire the marketing stack — analytics, consent, lead capture, A/B testing —
> **without hurting performance or privacy**. Marketo Forms is a direct JD line.
>
> ⚠️ Next 16 renamed `middleware.ts` → **`proxy.ts`** (edge code that runs before
> render). We use it for edge A/B assignment.

## Recap
| Topic | One-liner |
|---|---|
| **dataLayer** | A global array (`window.dataLayer`) that tags/analytics read — the decoupling point between app events and GTM. |
| **GTM** | Google Tag Manager — loads tags (GA4, pixels) from a container; load it **non-blocking + consent-gated**. |
| **Consent (GDPR/CCPA)** | Don't load analytics/cookies until the user opts in; a banner captures the choice; Consent Mode signals it. |
| **Marketo Forms** | Embed `forms2.min.js` → `MktoForms2.loadForm(...)`; inject hidden UTM fields; **override submit** to handle success in-app. |
| **Feature flag / A/B** | A stable per-user variant. Assign at the **edge** and read **server-side** so the right variant is in the HTML. |
| **No flicker / CLS** | Client-side experiments swap content after paint (flash + shift). Server/edge experiments don't. |
| **UTM / attribution** | Campaign params (`utm_*`) read from the URL, persisted, and fed to analytics + the lead form. |

### Abbreviations
| Short | Full form |
|---|---|
| **GTM / GA4** | Google Tag Manager / Google Analytics 4 |
| **UTM** | Urchin Tracking Module (campaign URL params) |
| **CLS / CWV** | Cumulative Layout Shift / Core Web Vitals (Day 9) |
| **proxy** | Next 16's edge function (formerly `middleware`) |

---

## 1. Analytics + consent (privacy-first)

The app pushes semantic events to a **dataLayer**; GTM (or GA4/Adobe) reads them —
so the app never hard-codes a vendor:

```ts
track("generate_lead", { form: "marketo", utm_source: "newsletter" });
// → window.dataLayer.push({ event: "generate_lead", ... })
```

**Consent gates loading.** Nothing analytics-related loads until the user accepts:
a banner writes a `cookie-consent` cookie; `GoogleTagManager` reads it (reactively,
via `useSyncExternalStore`) and only injects the GTM snippet when `granted`. On
change we also push a **Consent Mode** update (`analytics_storage: granted`).

```tsx
const consent = useSyncExternalStore(subscribeConsent, getConsent, () => null);
if (consent !== "granted") return null;     // no GTM, no cookies, pre-consent
return <Script id="gtm" strategy="afterInteractive">{/* GTM snippet */}</Script>;
```

---

## 2. Tag management: GTM loading strategy

GTM is third-party JS — it's the classic CWV killer if loaded wrong. Rules:
- **`strategy="afterInteractive"`** (Day 9) so it never blocks FCP/LCP.
- **Consent-gated** so it doesn't even load until opt-in (also a perf win for
  rejecters).
- Keep tags lean inside the container; prefer server-side GTM for heavy pixels.

---

## 3. Marketo Forms (clean integration)

The JD asks for this explicitly. The right pattern:

```tsx
// load the Marketo lib (non-blocking), then mount the form into a known <form id>.
<form id={`mktoForm_${FORM_ID}`} />
<Script src={`${BASE}/js/forms2/js/forms2.min.js`} strategy="afterInteractive" onLoad={onLoaded} />

function onLoaded() {
  window.MktoForms2.loadForm(BASE, MUNCHKIN, FORM_ID, (form) => {
    form.vals({ uTMSource: utm.utm_source, uTMCampaign: utm.utm_campaign }); // hidden fields
    form.onSuccess(() => {                 // custom submit handling
      track("generate_lead", { form: "marketo", ...utm });
      setSubmitted(true);
      return false;                        // stop Marketo's default redirect
    });
  });
}
```

Key moves: **inject UTM/attribution into hidden fields** so leads are attributable;
**override `onSuccess`** (return `false`) so you control the post-submit UX (in-app
thank-you, dataLayer event) instead of Marketo's hard redirect; style the Marketo
markup with your own CSS. (With no creds, a styled fallback form renders the same
fields + hidden UTMs + custom submit, so the page is runnable.)

---

## 4. A/B testing without hurting CWV (the headline)

**Client-side experiments flicker**: the page renders the control, then JS swaps to
the variant — a visible flash and often a layout shift (bad CLS/INP). **Do it at the
edge + server instead:**

```ts
// proxy.ts (Next 16 edge) — assign a sticky bucket on first visit
export function proxy(request: NextRequest) {
  const variant = request.cookies.get("ab-hero-cta")?.value ?? assignVariant();
  request.cookies.set("ab-hero-cta", variant);        // visible to THIS render
  const res = NextResponse.next({ request });
  res.cookies.set("ab-hero-cta", variant, { path: "/", maxAge: 2592000 }); // sticky
  return res;
}
export const config = { matcher: ["/campaign"] };
```

```tsx
// the page reads the cookie server-side and renders the right variant — in the HTML
const variant = (await cookies()).get("ab-hero-cta")?.value;   // "A" | "B"
<h1>{EXPERIMENTS["hero-cta"].variants[variant].headline}</h1>
```

Because the variant is decided at the edge and **rendered server-side**, the visitor
receives the correct hero in the initial HTML — **no control-then-variant flash, no
CLS**. Reading `cookies()` is request-time, so the variant lives in a `<Suspense>`
hole → the rest of the page stays a static shell (PPR, Day 2). Real stacks
(Vercel Flags, LaunchDarkly, Optimizely, GrowthBook) do the same; only the
assignment source changes.

---

## 5. Attribution, UTMs & campaign landing pages

Campaign links carry `?utm_source=…&utm_campaign=…`. We read them server-side, show
attribution, and feed them into the lead form's hidden fields (and analytics), so a
conversion is tied back to the campaign that drove it. A **campaign landing page**
(`/campaign`) bundles the three concerns: edge A/B hero + UTM attribution + Marketo
lead form.

---

## Build Exercise — ✅ BUILT & RUNNING

Added to the Day 1–11 project:

| Concept | Where |
|---|---|
| Experiment registry + edge assignment | `src/lib/flags.ts`, `src/proxy.ts` |
| dataLayer `track()` + consent store | `src/lib/analytics.ts` |
| Consent-gated **GTM** | `src/components/google-tag-manager.tsx` |
| **Cookie consent** banner | `src/components/cookie-consent.tsx` |
| **Marketo form** (UTM hidden fields, custom submit, fallback) | `src/components/marketo-form.tsx` |
| UTM/attribution helper | `src/lib/utm.ts` |
| **Campaign landing page** (A/B hero + UTM + form, PPR) | `src/app/(marketing)/campaign/page.tsx` |
| Env template | `.env.example` |

Run it:
```bash
cd c1_study/c1-marketing
npm run dev
# /campaign            → edge-assigned hero variant + Marketo form
# /campaign?utm_source=newsletter&utm_campaign=spring → attribution + hidden fields
# Accept the cookie banner → GTM loads (afterInteractive)
```

---

## Hands-On Walkthrough — Day 12 Proven in This Project

### A. Edge assigns a sticky A/B bucket (proxy)
```
GET /campaign → Set-Cookie: ab-hero-cta=B; Path=/; Max-Age=2592000; SameSite=lax
```
**What this proves:** the `proxy.ts` edge function pins a variant per visitor before render.

### B. The variant is server-rendered — no flicker
```
cookie ab-hero-cta=A → <h1>Launch your campaign in minutes</h1>
cookie ab-hero-cta=B → <h1>Ship landing pages without engineering</h1>
```
**What this proves:** the correct variant is in the initial HTML per bucket — the
visitor never sees the control flash then swap (no CLS/INP hit). `/campaign` is `◐`
(PPR): static shell + the variant/form as dynamic holes.

### C. UTM attribution + Marketo hidden fields
```
/campaign?utm_source=newsletter&utm_campaign=spring
  → "Attributed to: newsletter · campaign spring"
  → <input type="hidden" name="utm_source" value="newsletter">
    <input type="hidden" name="utm_campaign" value="spring">
```
**What this proves:** campaign params are read server-side and carried into the lead
form's hidden fields, so the conversion is attributable.

### D. Consent gates analytics
```
cookie banner present in HTML : yes ("We use cookies for analytics")
GTM gtm.js loaded pre-consent : 0   (nothing until Accept)
```
**What this proves:** no analytics scripts/cookies load until the user opts in
(GDPR/CCPA); after Accept, GTM loads via `afterInteractive` (non-blocking).

### Try-it-yourself experiments
1. **Force a bucket:** `curl -b 'ab-hero-cta=B' localhost:3000/campaign` → variant B
   headline; clear the cookie → the edge assigns a fresh sticky bucket.
2. **Attribution:** add `?utm_source=linkedin&utm_campaign=q3` → the page shows it and
   the form's hidden fields carry it.
3. **Consent flow:** load any page → banner shows; Accept → GTM `gtm.js` appears in the
   Network tab; Reject → it never loads.
4. **Submit a lead:** submit the form → in-app thank-you + a `generate_lead` event in
   `window.dataLayer` (no hard redirect).
5. **Wire real vendors:** set `NEXT_PUBLIC_GTM_ID` + the Marketo `BASE/MUNCHKIN/FORM_ID`
   in `.env.local` → real GTM + the real Marketo form load, code unchanged.

---

## Self-Check Questions & Answers

**1. How do you run an A/B test without hurting Core Web Vitals?** *(JD line)*
Don't do it client-side — rendering the control then swapping to the variant in JS
causes a flash and a layout shift (hurts CLS/INP) and adds blocking script. Instead
assign the bucket at the **edge** (Next 16 `proxy`, sticky cookie) and read it
**server-side**, so the correct variant is in the initial HTML — no flash, no shift,
no extra client JS. Keep the variant in a `<Suspense>` hole so the rest of the page
stays a static shell (PPR). Managed tools (Vercel Flags, LaunchDarkly, Optimizely,
GrowthBook) follow the same server-decided pattern; if you must run a client
experiment, reserve space and gate paint to avoid the flicker.

**2. How do you integrate Marketo Forms cleanly?** *(JD line)*
Load `forms2.min.js` non-blocking (`next/script` afterInteractive), then
`MktoForms2.loadForm(baseUrl, munchkinId, formId, cb)` to mount it into a known
`<form id="mktoForm_…">`. In the callback, inject UTM/attribution into **hidden
fields** (`form.vals(...)`) and override `form.onSuccess(() => { … return false })`
so Marketo doesn't hard-redirect — you handle success in-app (thank-you state +
a `generate_lead` dataLayer event). Style the Marketo markup with your own CSS, and
keep the munchkin/form IDs in env config. Validate required fields and handle the
no-JS/slow-load case gracefully.

**3. How do you load analytics without hurting performance or privacy?**
Performance: load GTM/GA4 via `next/script` `afterInteractive` (or `lazyOnload` for
non-essential tags) so it never blocks FCP/LCP, and push events through a `dataLayer`
rather than per-vendor scripts. Privacy: consent-gate it — don't load any
analytics/cookies until the user opts in (a GDPR/CCPA banner), and emit a Consent
Mode signal on the decision. Prefer a lean container and consider server-side GTM for
heavy pixels.

**4. What is a data layer and why use it?**
`window.dataLayer` is a global array the app pushes structured events to
(`{ event: "generate_lead", … }`); GTM/analytics read from it. It **decouples** your
app from any specific analytics vendor — you emit semantic events once, and marketers
wire them to tags in GTM without code changes. It also centralizes naming and makes
consent gating and testing straightforward.

**5. How do you handle UTM attribution?**
Read `utm_*` params from the campaign URL (server-side here), display/persist them
(cookie/localStorage for first-touch), and inject them into the lead form's hidden
fields and analytics events — so a conversion is attributable to the source/medium/
campaign that drove it. Persisting first-touch survives later navigations that drop
the params.

**6. Client-side vs server-side experiments — trade-offs?**
Client-side is easy to set up and supports DOM-mutation tools, but it flickers
(control→variant), shifts layout, adds blocking JS, and is blockable by ad blockers.
Server/edge-side decides the variant before render so there's no flash or CLS, less
client JS, and it works with SSR/SSG + caching (bucket in the cache key or a dynamic
hole). The cost is it needs server/edge logic and careful caching. For a performance-
sensitive marketing site, prefer server/edge.

**7. What changed from `middleware` to `proxy` in Next 16, and why use it here?**
Next 16 renamed the `middleware.ts` convention to `proxy.ts` — edge code that runs
before a request is rendered (redirects, rewrites, headers, cookies). We use it to
assign the A/B bucket at the edge and forward it on the request (`NextResponse.next({
request })`) so the page's `cookies()` sees it on the very first visit and SSRs the
right variant — no flicker.

---

## Interview Soundbites (tie to your NBA.com / JPMC work)
- *"A/B tests run at the edge, not the client — I assign a sticky bucket in `proxy`
  and render the variant server-side, so there's no control-then-variant flash and no
  CLS. Managed flag tools follow the same server-decided pattern."*
- *"Marketo forms: load forms2 non-blocking, inject UTM hidden fields, and override
  onSuccess so I control the post-submit UX and fire a `generate_lead` event — no hard
  redirect."*
- *"Analytics go through a dataLayer and are consent-gated — nothing loads before
  opt-in, and GTM is `afterInteractive` so it never blocks LCP."*
- *"Campaign landing pages tie it together: edge variant + UTM attribution carried into
  the lead form, all server-rendered so performance and tracking both hold up."*
