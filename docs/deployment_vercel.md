# Deploying nr-next-marketing to Vercel

> Goal: get the site live on Vercel cloud to experiment with every feature built
> across Days 1–13. Method: **GitHub → Vercel Dashboard import** (auto preview-per-PR
> + prod-on-main). Strategy: **deploy with built-in fallbacks first**, add real
> integration env vars later.
>
> Legend: ✅ done · ▶️ you do this (browser/login) · 💡 note

---

## Prerequisites — ✅ DONE

| Item | Status |
|---|---|
| App is a standalone repo (package.json at root) | ✅ `nr-next-marketing/` |
| `git init` + commits on `main` | ✅ 3 commits |
| `.gitignore` excludes `node_modules`, `.next`, `.env*`, `.vercel` | ✅ |
| GitHub repo created (public) | ✅ `github.com/rnanania/nr-next-marketing` |
| `main` pushed + in sync | ✅ `HEAD == origin/main` |
| Builds clean locally (`npm run build`) | ✅ all routes, proxy/middleware detected |
| No secrets committed (`.env.local` absent) | ✅ |

So GitHub side is complete. Remaining work is on Vercel.

---

## Step 1 — Import the repo into Vercel ▶️

1. Go to **https://vercel.com/new** (sign in with **GitHub** as `rnanania` if prompted;
   first time: authorize the Vercel ↔ GitHub app, granting access to the repo).
2. Under **Import Git Repository**, find **`nr-next-marketing`** → click **Import**.
   - 💡 If it's not listed: "Adjust GitHub App Permissions" → grant access to the repo.

## Step 2 — Confirm project settings ▶️

Vercel auto-detects Next.js. Leave the defaults:

| Setting | Value |
|---|---|
| Framework Preset | **Next.js** (auto) |
| Root Directory | `./` (repo root — the app is at the root) |
| Build Command | `next build` (auto) |
| Output | (managed by Next adapter — leave default) |
| Install Command | `npm install` (auto) |
| Node.js Version | 22.x (Project → Settings → General if you need to pin) |

💡 **Environment Variables:** skip for now (fallbacks-first). The app runs without
any — Contentful uses a fixture, Marketo renders a fallback form, GTM uses a demo ID.

## Step 3 — Deploy ▶️

Click **Deploy**. Vercel installs, runs `next build` (React Compiler via Babel makes
this a touch slower), and publishes. You'll get a production URL like
`https://nr-next-marketing.vercel.app`.

💡 First build expectations: `◐ /campaign`, `◐ /news`, `◐ /blog/[slug]` are Partial
Prerender; `ƒ /sitemap.xml`, `ƒ /opengraph-image`, `ƒ /api/revalidate` are dynamic;
`proxy.ts` runs as **Edge Middleware** (the A/B assignment).

---

## Step 4 — Point the site at its real URL ▶️ + ✅

Canonicals, OG tags, and the sitemap use `NEXT_PUBLIC_SITE_URL` (defaults to the
placeholder `https://pace.example.com`). After the first deploy:

1. Vercel → Project → **Settings → Environment Variables** → add:
   `NEXT_PUBLIC_SITE_URL = https://nr-next-marketing.vercel.app` (Production + Preview).
2. **Redeploy** (Deployments → ⋯ → Redeploy) so the new value is baked in.

(Once you add a custom domain, set `NEXT_PUBLIC_SITE_URL` to that instead.)

---

## Step 5 — Verify the live deployment ▶️

On the production URL, exercise the features built so far:

| Feature (day) | Check |
|---|---|
| Rendering / PPR (2) | `/news`, `/blog/[slug]` stream; static pages instant |
| Data + revalidate (3) | `/integrations` → "Revalidate" button; `POST /api/revalidate?secret=…&tag=cms` |
| React 19 (4) | `/features` — filter + optimistic feedback |
| Tailwind + theme (6) | header 🌙/☀️ toggle persists; `/showcase` |
| shadcn/ui (7) | `/design-system` — dialog, toasts, form (light **and** dark) |
| A11y (8) | Tab → skip link; focus rings; contrast in both themes |
| CWV / images (9) | `/` hero is AVIF via `/_next/image`; lazy form on `/design-system` |
| SEO (10) | `/sitemap.xml`, `/robots.txt`, `/opengraph-image` (PNG) |
| Contentful (11) | `/landing`; preview: `/api/preview?secret=dev-secret` → drafts + banner |
| Marketing/A-B (12) | `/campaign` — variant differs per visitor (clear cookies to re-bucket); UTM in form |

💡 The `secret` defaults to `dev-secret` unless you set `REVALIDATE_SECRET` (Step 6).

---

## Step 6 — (Later) wire real integrations

Add these in **Settings → Environment Variables** when you want live services, then
redeploy. All optional — the app degrades gracefully without them.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical/OG/sitemap origin (set in Step 4) |
| `REVALIDATE_SECRET` | Secret for `/api/revalidate` + `/api/preview` |
| `CONTENTFUL_SPACE_ID`, `CONTENTFUL_ENVIRONMENT`, `CONTENTFUL_DELIVERY_TOKEN`, `CONTENTFUL_PREVIEW_TOKEN` | Live Contentful (replaces the fixture) |
| `NEXT_PUBLIC_GTM_ID` | Real GTM container |
| `NEXT_PUBLIC_MARKETO_BASE_URL`, `NEXT_PUBLIC_MARKETO_MUNCHKIN_ID`, `NEXT_PUBLIC_MARKETO_FORM_ID` | Real Marketo form |

💡 Use **different values per environment** (e.g. Contentful *Preview* token on
Preview, *Delivery* on Production) — Vercel scopes env vars to Production/Preview/Dev.

---

## Auto-deploy on every commit (Vercel Git integration) ✅ mechanism

Deploys are triggered by **Vercel's native Git integration** — once the repo is
imported (Step 1), this is **on by default**, no config or secrets needed:

- **Every push to `main`** → automatic **production** build + deploy.
- **Every push to any other branch / PR** → automatic **preview** deploy (unique URL,
  commented on the PR) for review before merge.
- A failed build does **not** replace the current production deployment.

**Verify it's enabled** (Vercel → Project → **Settings → Git**):
- *Connected Git Repository* = `rnanania/nr-next-marketing`
- *Production Branch* = `main`
- Automatic deployments are enabled (default). (You can later add an *Ignored Build
  Step* to skip no-op commits, but it's off by default.)

**Test it:** push any commit to `main` → a new **Production** deployment appears under
the project's *Deployments* tab within seconds.

> `.github/workflows/ci.yml` still runs the quality gates (lint/typecheck/test/build)
> on GitHub in parallel with Vercel's build. `.github/workflows/deploy.yml` is now
> **manual-only** (`workflow_dispatch`) — an opt-in alternative for Actions-driven
> deploys; it does **not** run on push, so it won't double-deploy or fail. To use it,
> add `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` secrets and run it from the
> Actions tab.

## Rollback

Vercel keeps **immutable deployments**: Deployments → pick a previous one → **Promote
to Production** = instant rollback, no rebuild. Feature flags (Day 12) give
per-feature rollback with no deploy at all.

---

## Status log

- [x] Repo on GitHub, `main` pushed, builds clean — ✅
- [ ] Step 1–3: imported + first deploy (production URL: __________)
- [ ] Step 4: `NEXT_PUBLIC_SITE_URL` set + redeployed
- [ ] Step 5: live verification pass
- [ ] Step 6: real integrations (when needed)
