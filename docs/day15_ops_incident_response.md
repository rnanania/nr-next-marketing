# Day 15 — Operations, Reliability & Incident Response

> Target: Next **16.2** on **Vercel**. Build task: **wire Sentry + define a simple
> incident runbook for the site.** Theme: when a campaign launch page throws errors in
> prod, can you *detect → triage → mitigate → recover → learn* fast? This day wires
> the observability plumbing (the Next 16 way) and writes the runbook.

## Recap
| Topic | One-liner |
|---|---|
| **Observability** | Logs + metrics + traces — the three pillars that let you see what prod is doing. |
| **`instrumentation.ts`** | Next 16's stable boot hook; `onRequestError` funnels all **server** errors to your reporter. |
| **Error boundaries** | `error.tsx` (per route) + `global-error.tsx` (root) catch render errors → friendly UI instead of a white screen. |
| **Health check** | A `/api/health` endpoint a monitor polls; 200 = up, 503 = degraded. |
| **SLO / error budget** | A reliability target (e.g. 99.9% up) and the allowed failure within it. |
| **MTTR** | Mean Time To Recovery — the number incident response optimizes. |
| **Runbook** | A pre-written "when X happens, do Y" so you don't improvise at 2am. |
| **Blameless postmortem** | After an incident: what happened, why, what we change — no blame. |

### Abbreviations
| Short | Full form |
|---|---|
| **SLO / SLI** | Service Level Objective / Indicator |
| **MTTR / MTTD** | Mean Time To Recovery / Detect |
| **RUM** | Real User Monitoring (field data — Day 9) |
| **OTel** | OpenTelemetry (vendor-neutral tracing) |
| **DSN** | Data Source Name (Sentry's project key) |

---

## 1. Observability, the Next 16 way
`instrumentation.ts` (stable, no flag) runs once at server boot. Two exports:
- **`register()`** — init your provider here (Sentry, `registerOTel`).
- **`onRequestError(err, request, context)`** — Next calls this for every server-side
  error (RSC render, route handler, Server Action, edge proxy). It's the single funnel
  for server errors → our reporter.

We keep the reporter **provider-agnostic** (`src/lib/observability.ts`): a webhook if
configured, else structured JSON to the console (→ Vercel Runtime Logs). Swapping in
real Sentry is `npm i @sentry/nextjs` + `Sentry.captureException` in that one shim.

## 2. Error boundaries (don't show users a white screen)
- **`error.tsx`** wraps a route segment; on a render throw it shows fallback UI with a
  **Reference ID** (`error.digest`) that matches the server log line, plus a retry.
- **`global-error.tsx`** is the last resort — it catches errors in the *root layout*
  and replaces it, so it renders its own `<html>/<body>` with inline styles.
- Next 16: the recovery prop is **`unstable_retry`** (re-fetch + re-render), not `reset`.

## 3. Detection: health checks & monitoring
`/api/health` returns live status (`connection()` keeps it uncached). A monitor
(BetterStack/Pingdom/a load balancer) polls it; 503 → page on-call. The `/status` page
renders the same `getHealth()` for humans. RUM (Day 9 Speed Insights) + Vercel
Analytics events (the `lead` event) catch *silent* regressions metrics-first.

## 4. Incident response loop
`detect → triage → mitigate → recover → postmortem`. The fastest mitigation on Vercel
is usually **instant rollback** (promote the previous deployment) — recover first,
diagnose after. MTTR is the score.

## Build Exercise
| What | Where |
|---|---|
| Provider-agnostic error reporter (Sentry seam) | `src/lib/observability.ts` |
| Boot hook + server-error funnel | `src/instrumentation.ts` (`register`, `onRequestError`) |
| Route + root error boundaries | `src/app/(marketing)/error.tsx`, `src/app/global-error.tsx` |
| Health endpoint (200/503) | `src/app/api/health/route.ts` |
| Visible status page (+ nav, study note) | `src/app/(marketing)/status/page.tsx` |
| Incident runbook | this doc, below |

## Hands-On Walkthrough (proven)
**Build — health is dynamic, status is PPR; boundaries/instrumentation compile:**
```
$ npm run build
├ ƒ /api/health
├ ◐ /status                                       1d      1w
```

**Instrumentation boot hook ran (register fired, mode resolved):**
```
[instrumentation] booted · observability=console · runtime=nodejs
```

**Health endpoint — up, and the simulated incident:**
```
$ curl -s -w "HTTP %{http_code}\n" localhost:3000/api/health
{"status":"ok","env":"local","commit":"—","region":"—","uptimeSeconds":1,"timestamp":"2026-06-30T21:26:29.414Z"}
HTTP 200
$ curl -s -o /dev/null -w "HTTP %{http_code}\n" "localhost:3000/api/health?simulate=unhealthy"
HTTP 503
```

**Status page renders the live snapshot:**
```
$ curl -s localhost:3000/status | grep -oE "All systems operational|/api/health"
All systems operational
/api/health
```

**Couldn't run here (no Vercel / no real provider):** real Sentry capture (the shim
logs/POSTs instead — `observability=console` without creds), the live `env`/`commit`/
`region` (Vercel system env), and a real rollback. The error boundaries are best
demoed live by throwing in a page (or React DevTools' error toggle).

## Incident Runbook — "campaign page is throwing in prod"
> The JD's literal question. Keep it calm and ordered.

1. **Detect** — alert fires (health 503 / error-rate spike / Sentry) or a report comes in.
2. **Declare & trace** — open Vercel **Runtime Logs**, filter by the route; grab the
   `digest` from a user's "Reference ID" to find the exact server log line.
3. **Assess blast radius** — one route or sitewide? Check `/status` and `/api/health`.
4. **Mitigate FAST (recover before diagnosing):**
   - If a recent deploy caused it → **roll back**: Vercel → Deployments → promote the
     last good deployment (seconds; no rebuild).
   - If a flag/experiment caused it → flip the flag off (Day 12).
   - If a third party is down (Contentful/Marketo) → the app already degrades to
     fixtures/fallbacks; confirm and communicate.
5. **Verify** — health back to 200, error rate normal, spot-check the page.
6. **Communicate** — update status/stakeholders; note user impact + window.
7. **Postmortem (blameless)** — timeline, root cause, MTTD/MTTR, and 1–3 concrete
   preventions (a test, an alert threshold, a guardrail). File follow-ups.

## Try-it-yourself
- Hit `/api/health?simulate=unhealthy` → a monitor pointed here would alert.
- Set `ERROR_WEBHOOK_URL` to a webhook.site URL, throw in a Server Action, and watch
  the structured error arrive (the Sentry stand-in).
- On Vercel: deploy a deliberate error, then **roll back** and time your MTTR.

## Self-Check Q&A
- **"A campaign page is throwing errors in prod — walk me through your response."** (JD)
  → detect (alert/health) → trace via Runtime Logs + `digest` → mitigate by **rolling
  back** the bad deploy (recover first) → verify health → blameless postmortem with
  preventions. Optimize MTTR.
- **"How do you capture errors in Next 16?"** → `instrumentation.ts` `onRequestError`
  for server errors + `error.tsx`/`global-error.tsx` for render errors, both funneled
  to one reporter (Sentry).
- **"What's a health check for and why 503?"** → a machine-readable liveness signal for
  monitors/load balancers; 503 (not 200) so the monitor actually treats it as down.
- **"SLO vs SLA vs error budget?"** → SLO is your internal target, SLA the customer
  promise, error budget the allowed failure under the SLO that paces risk.

## Interview Soundbites
- *"Recover before you diagnose — on Vercel the fastest mitigation is promoting the last
  good deployment, so MTTR is seconds. I trace afterward using the error `digest` that
  ties the user's Reference ID to the exact server log."*
- *"I wire observability at the framework seam — `instrumentation.ts`'s `onRequestError`
  plus App Router error boundaries — so every server and render error funnels to one
  reporter (Sentry). At JPMC, disciplined logging + runbooks were the difference between
  a 5-minute and a 50-minute incident."*
- *"Reliability is designed in: the site degrades to fixtures when Contentful/Marketo are
  down, so a dependency outage is a soft failure, not a white screen."*
