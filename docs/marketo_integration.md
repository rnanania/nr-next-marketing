# Marketo Integration — End to End

> How lead capture is wired into this Next.js 16 marketing site: **attributable**
> (first-touch UTM persistence), **reliable** (server-side REST submit that survives
> ad-blockers and no-JS), **validated** (zod at the boundary), and **consent-aware**.
> Marketo Forms is a direct JD line. Concepts also in
> [`day12_marketing_integrations.md`](day12_marketing_integrations.md); analytics
> side in [`analytics_stack.md`](analytics_stack.md).

## The two integration modes

There are two legitimate ways to put a Marketo form on a page, and this app supports
both — picked automatically by **which credentials are present**:

| | MODE 1 — Classic embed | MODE 2 — First-party + server submit |
|---|---|---|
| **How** | Load `forms2.min.js`, `MktoForms2.loadForm(...)` | Your own styled `<form action={submitLead}>` → Marketo REST API server-side |
| **Triggered when** | `NEXT_PUBLIC_MARKETO_*` set | default (no client creds) |
| **Works without JS?** | ❌ no | ✅ yes (real form POST) |
| **Survives ad-blockers?** | ❌ `forms2.min.js` is widely blocked | ✅ submit happens server-side |
| **Validation** | Marketo's | **zod** at the boundary + in the REST client |
| **Secrets** | none (public ids) | `client_id`/`client_secret` **server-only** |
| **Best for** | parity with existing Marketo forms | reliability / production |

> Why Mode 2 matters: `forms2.min.js` is one of the most ad-blocked third-party
> scripts on the web. A client-only Marketo form loses the lead **silently** when the
> script is blocked or JS is off. Submitting from the server removes that failure mode
> — and gives progressive enhancement for free.

## Architecture

```
  Campaign link (?utm_source=…) ─────────────┐
                                             ▼
  ┌──────────── EDGE (src/proxy.ts) ────────────────────────────┐
  │ first-touch UTM → cookie `utm_first` (90d)   A/B variant cookie│
  └───────────────────────┬──────────────────────────────────────┘
                          ▼
  ┌──── /campaign (Server Component, PPR) ───────────────────────┐
  │ resolve attribution: first-touch cookie ?? current URL utm   │
  │   → <MarketoForm utm={…}>                                    │
  └───────────────────────┬──────────────────────────────────────┘
            ┌──────────────┴───────────────┐
            ▼ MODE 1 (creds)               ▼ MODE 2 (default)
  forms2.min.js + loadForm        <form action={submitLead}>  (client island)
  hidden UTM vals()                       │ POST (works pre-JS)
  onSuccess → track()                     ▼
                              submitLead (Server Action, "use server")
                                 │ zod validate (boundary)
                                 ▼
                              marketoPushLead()  ── server-only ──┐
                                 │ OAuth token → POST /rest/v1/leads.json
                                 │ (no creds → fixture mode)       │
                                 ▼                                 │
                              Marketo  ◀────────────────────────────┘
            both modes → track("generate_lead", …) → dataLayer → GTM (see analytics_stack.md)
```

## Files

| File | Role |
|---|---|
| `src/proxy.ts` | Edge: capture **first-touch** UTMs site-wide → `utm_first` cookie; A/B variant for `/campaign`. |
| `src/lib/utm.ts` | UTM keys, `readUtmParams`, `hasUtm`, `serializeUtm`/`parseUtm`, `UTM_FIRST_TOUCH_COOKIE`. |
| `src/app/(marketing)/campaign/page.tsx` | Resolves first-touch vs URL attribution; renders the form in a PPR hole. |
| `src/components/marketo-form.tsx` | Client island; picks Mode 1 embed vs Mode 2 action form. |
| `src/lib/actions.ts` | `submitLead` Server Action — zod validate → `marketoPushLead`. |
| `src/lib/server/marketo.ts` | `server-only` REST client: OAuth token (cached) + `createOrUpdate` lead push; fixture fallback. |
| `.env.example` | Mode 1 (`NEXT_PUBLIC_MARKETO_*`) + Mode 2 secrets (`MARKETO_REST_ENDPOINT/CLIENT_ID/CLIENT_SECRET`). |

---

## Step 1 — Attribution: capture UTMs at the edge (first-touch)

A campaign link lands as `…/campaign?utm_source=newsletter&utm_campaign=spring`. The
problem: the moment the visitor clicks an internal `<Link>`, the query string is gone,
so a form rendered later has nothing to attribute. Fix: **persist first-touch at the
edge**, before render.

```ts
// src/proxy.ts (runs site-wide via a broad matcher; A/B stays scoped to /campaign)
const incomingUtm = readUtmParams(url.searchParams);
if (hasUtm(incomingUtm) && !request.cookies.has(UTM_FIRST_TOUCH_COOKIE)) {
  response.cookies.set(UTM_FIRST_TOUCH_COOKIE, serializeUtm(incomingUtm), {
    path: "/", maxAge: 60 * 60 * 24 * 90, sameSite: "lax",   // 90 days
  });
}
```

- **First-touch** = set only if the cookie doesn't exist yet (the campaign that
  *first* brought them in). Swap the `!has` guard to always-set for last-touch.
- Cookie value is **plain JSON** (`serializeUtm`); the Next cookies API does transport
  encoding on `set()` and decoding on `get()` — encoding it ourselves would
  double-encode (`%7B` → `%257B`).
- The matcher excludes `api`, `_next/*`, and metadata files so it only runs on real
  pages.

## Step 2 — Resolve attribution on the page

```tsx
// src/app/(marketing)/campaign/page.tsx (Server Component)
const urlUtm = readUtmParams(await searchParams);                       // last-touch
const firstTouch = parseUtm((await cookies()).get(UTM_FIRST_TOUCH_COOKIE)?.value);
const utm = hasUtm(firstTouch) ? firstTouch : urlUtm;                   // prefer durable
<MarketoForm utm={utm} />
```

`cookies()`/`searchParams` are request-time, so this lives in a `<Suspense>` hole —
the page is a static shell with dynamic holes (PPR).

## Step 3 — The form (one component, two modes)

`src/components/marketo-form.tsx` picks the mode from credentials:

```tsx
const configured = Boolean(BASE && MUNCHKIN && FORM_ID);
return configured ? <MarketoEmbed utm={utm} /> : <ServerLeadForm utm={utm} />;
```

**Mode 1 — classic embed.** Load `forms2.min.js`, then in the `loadForm` callback
inject UTMs into hidden fields and override submit so Marketo doesn't hard-redirect:

```tsx
form.vals({ uTMSource: utm.utm_source, uTMMedium: utm.utm_medium, uTMCampaign: utm.utm_campaign });
form.onSuccess(() => { track("generate_lead", { form: "marketo", ...utm }); setSubmitted(true); return false; });
```

**Mode 2 — first-party + Server Action.** A real `<form action={submitLead}>` via
`useActionState` (same pattern as `subscribe-form.tsx`): hidden UTM inputs, a pending
button via `useFormStatus`, inline error from the returned state, and `generate_lead`
pushed once the server confirms success.

## Step 4 — Server Action (zod boundary)

```ts
// src/lib/actions.ts  ("use server")
const leadFormSchema = z.object({
  email: z.email("Please enter a valid work email."),
  firstName: z.string().trim().max(80).optional(),
  utm_source: utm, utm_medium: utm, /* …all UTM keys… */
});

export async function submitLead(_prev: LeadState, formData: FormData): Promise<LeadState> {
  const parsed = leadFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid submission." };
  const result = await marketoPushLead(parsed.data);
  return result.ok ? { ok: true, message: "Thanks — we'll be in touch shortly." }
                   : { ok: false, message: "Something went wrong — please try again." };
}
```

Server Actions are reachable by direct POST (not just your UI), so validation lives
**inside** the action — never trust the client.

## Step 5 — Server-side Marketo REST client (secrets stay server-only)

```ts
// src/lib/server/marketo.ts
import "server-only";   // build FAILS if any Client Component imports this
```

- **Auth:** `client_credentials` → access token, cached in-module until ~30s before
  expiry (avoids a token request per lead).
- **Push:** `POST /rest/v1/leads.json` with `action:"createOrUpdate", lookupField:"email"`.
- **Marketo quirk:** returns HTTP 200 even on per-record failure — inspect
  `json.success` / `json.errors`, don't trust the status code alone.
- **No creds → fixture mode:** logs the lead and returns success so the whole flow
  runs end-to-end with zero Marketo setup.

Set up the credentials in Marketo as a **LaunchPoint → Custom Service** (gives you
`client_id`/`client_secret`); the REST endpoint is your instance's `…mktorest.com`.

## Consent stance (why the form isn't cookie-gated)

GTM is hard-gated behind the consent banner because it sets tracking cookies. The
**lead form is different**: submitting it is an *explicit user action*, so the lawful
basis is the submission itself — gating it behind a cookie banner would block the very
thing the user is trying to do. So the form renders unconditionally.

What we **deliberately do NOT** load is **Munchkin** (Marketo's behavioral
page-tracking script, `munchkin.js`) — *that* is passive tracking and would need to be
consent-gated like GTM. Only `forms2.min.js` (Mode 1) is ever loaded here.

## Hands-on verification (proven)

`npm run build` → `/campaign` stays PPR (`◐`), `Proxy (Middleware)` active.
`npm run start`, then:

```
1. Land with UTM → first-touch cookie set (single-encoded JSON):
   $ curl -c cj -s '…/campaign?utm_source=newsletter&utm_campaign=spring' -o /dev/null
   $ grep utm_first cj
   utm_first  %7B%22utm_source%22%3A%22newsletter%22%2C%22utm_campaign%22%3A%22spring%22%7D

2. Revisit /campaign with NO utm in the URL — attribution persists:
   $ curl -b cj -s …/campaign | grep 'Attributed to'
   Attributed to: <strong>newsletter</strong> · campaign <strong>spring</strong>

3. Mode 2 server form renders with hidden UTM fields:
   $ curl -b cj -s …/campaign | grep -oE 'Request a demo|name="utm_[a-z]+"|name="email"'
   Request a demo / name="email" / name="utm_source" / name="utm_medium" / name="utm_campaign"
```

Also verified: `npm run typecheck`, `npm run lint` pass.

**Not provable here** (no headless browser; `server-only` can't be imported in tests):
the live Marketo REST round-trip (runs in **fixture mode** without creds — check the
server log line `[marketo] fixture mode — would push lead: …`), the Mode 1 embed
(needs a real Marketo form), and the `generate_lead` dataLayer push (inspect
`window.dataLayer` after submitting in a browser).

## Observing it in Vercel (easy end-to-end demo)

Three Vercel tools confirm the flow in production:

1. **Runtime Logs** (Project → Logs) — zero code. The Server Action runs as a Vercel
   Function, so its `console.*` output appears live. Submit a lead and watch for
   `[marketo] fixture mode — would push lead: …` (no creds) or a real-mode error.
2. **Observability → Functions** — invocation count, error rate, and duration of the
   `submitLead` action.
3. **Web Analytics → Events** — `submitLead` fires a **server-side custom event** on
   every confirmed lead, so leads show up as a countable metric in the same dashboard
   as page views:

   ```ts
   // src/lib/actions.ts — after a successful marketoPushLead()
   import { track } from "@vercel/analytics/server";
   await track("lead", { mode: result.mode, utm_source: …, utm_campaign: … });
   ```

   Because it fires **server-side after the lead is confirmed**, it can't be
   ad-blocked or lost like a client beacon — and it's cookieless, so no consent gate.
   The `mode` property (`marketo` | `fixture`) lets you tell real leads from demo ones
   in the Events breakdown. No-op locally / off Vercel.

## Going live

1. **Mode 1 (embed):** set `NEXT_PUBLIC_MARKETO_BASE_URL`, `…_MUNCHKIN_ID`, `…_FORM_ID`
   and make sure your Marketo form has the hidden fields (`uTMSource`, …) mapped.
2. **Mode 2 (REST, recommended):** create a LaunchPoint custom service, set
   `MARKETO_REST_ENDPOINT`, `MARKETO_CLIENT_ID`, `MARKETO_CLIENT_SECRET`, and map the
   field API names (`utm_source`, …) on the lead record.
3. Deploy. Submit a test lead; confirm it lands in Marketo (Lead Activity).
