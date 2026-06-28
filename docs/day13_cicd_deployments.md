# Day 13 — CI/CD, Deployments & Branching

> Target: GitHub Actions + Vercel (and AWS equivalents), the Day 1–12 app. Build
> task: **a GitHub Actions workflow (lint + test + build) + a Vercel preview flow.**
> Theme: how a change safely reaches production — gates, preview deploys, branching,
> and release strategy.

## Recap
| Topic | One-liner |
|---|---|
| **CI** Continuous Integration | On every push/PR, run automated gates (lint, typecheck, test, build) before merge. |
| **CD** Continuous Delivery/Deploy | Automatically deploy merged changes (prod on main) + a **preview per PR**. |
| **Quality gates** | lint → typecheck → test → build, cheapest-first, all required to merge. |
| **Preview deploy** | A unique URL per PR so reviewers/stakeholders see the change live before merge. |
| **Trunk-based** | Short-lived branches off `main`, merge fast behind flags — fewer long-lived divergences than GitFlow. |
| **Environments** | dev → preview (per-PR) → staging → production, with per-env config/secrets. |
| **SemVer** | `MAJOR.MINOR.PATCH` — breaking / feature / fix; drives changelogs + releases. |
| **Safe release** | Canary/blue-green, feature flags (Day 12), and fast **rollback**. |

### Abbreviations
| Short | Full form |
|---|---|
| **CI/CD** | Continuous Integration / Delivery (or Deployment) |
| **PR** | Pull Request |
| **SemVer** | Semantic Versioning |
| **IaC** | Infrastructure as Code |
| **MTTR** | Mean Time To Recovery (Day 15) |

---

## 1. The CI pipeline (gates)

`.github/workflows/ci.yml` runs on every PR and push to `main` (path-filtered to the
app). Gates run **cheapest-first** so failures surface fast:

```yaml
- run: npm ci            # reproducible install from the lockfile
- run: npm run lint      # eslint (incl. jsx-a11y — Day 8)
- run: npm run typecheck # next typegen && tsc --noEmit
- run: npm test          # vitest (unit tests for pure utils)
- run: npm run build     # next build (also type-checks + prerenders)
```

Details that matter: `actions/setup-node` with **npm cache** (fast installs),
`concurrency: cancel-in-progress` (don't waste minutes on superseded commits), and a
**path filter** so unrelated repo edits don't trigger the app pipeline. Branch
protection on `main` requires this job to pass before merge.

The `test` gate is real: vitest unit tests cover the pure utilities (`cn`, the CMS
zod schema, UTM parsing, Contentful image transforms, flags) — fast, no rendering.

---

## 2. CD: preview per PR, production on main

`.github/workflows/deploy.yml`:
- **PR → preview deploy**: `vercel pull --environment=preview` → `vercel build` →
  `vercel deploy --prebuilt` ⇒ a unique URL reviewers can click.
- **main → production**: same with `--prod`.

> Vercel's native Git integration already does preview-per-PR + prod-on-main with
> zero config. The explicit CLI workflow is the portable equivalent — for when CI
> should own the deploy, or you deploy elsewhere. Secrets: `VERCEL_TOKEN`,
> `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

**Env vars per environment:** Vercel scopes env vars to Development / Preview /
Production; `vercel pull --environment=…` fetches the right set so preview and prod
differ safely (e.g. Contentful Preview vs Delivery tokens — Day 11).

---

## 3. Deployment targets — Vercel & AWS

| | Vercel | AWS |
|---|---|---|
| Static/SSG + ISR | native (CDN + ISR + PPR) | **S3 + CloudFront** (static) / Amplify Hosting |
| SSR / Route Handlers | serverless/edge functions | **Lambda@Edge / Lambda / ECS/Fargate** |
| Preview per PR | built-in | Amplify preview envs, or custom (CDK + CodePipeline) |
| Best for | Next.js, fastest path | existing AWS org, fine-grained control/compliance |

For a Next marketing site, Vercel is the lowest-friction (ISR/PPR/edge "just work").
On AWS you'd use the **OpenNext** adapter (or Amplify) to map App Router features onto
Lambda + CloudFront. Either way: static/ISR served from a CDN, dynamic via functions.

---

## 4. Branching strategy & how a change reaches production

**Trunk-based** for a marketing site moving fast:
1. Branch off `main` (`feat/hero-copy`) — short-lived.
2. Open a PR → **CI gates** run + a **preview deploy** appears.
3. Review on the preview URL (design/marketing sign-off), CI green, required reviews.
4. Merge to `main` (squash) → **production deploy** automatically.
5. Tag a release (SemVer) + changelog entry for anything notable.

Risky changes ship **behind a feature flag** (Day 12) so merge ≠ release — you flip
the flag (or ramp a canary) and can turn it off instantly without a redeploy.
**GitFlow** (long-lived `develop`/`release` branches) suits versioned/desktop
software; for continuously-deployed web, trunk-based minimizes merge pain and gets
changes out faster.

---

## 5. Release strategy: SemVer, canary/blue-green, rollback

- **SemVer + changelog**: `MAJOR.MINOR.PATCH`; keep a `CHANGELOG.md`; tag releases.
- **Canary**: route a small % of traffic to the new version, watch metrics (Day 15),
  then ramp to 100%.
- **Blue-green**: keep the old version live, switch traffic atomically, switch back
  instantly if needed.
- **Rollback**: Vercel keeps **immutable deployments** — promoting a previous
  deployment is an instant rollback (no rebuild). Feature flags give per-feature
  rollback without any deploy.

---

## Build Exercise — ✅ BUILT & VERIFIED

| Artifact | Where |
|---|---|
| **CI workflow** (lint + typecheck + test + build) | `.github/workflows/ci.yml` |
| **Deploy workflow** (Vercel preview/prod) | `.github/workflows/deploy.yml` |
| `typecheck` + `test` scripts | `package.json` |
| **Vitest** config + unit tests | `vitest.config.ts`, `src/**/*.test.ts` |
| Dependabot + PR template + CHANGELOG | `.github/dependabot.yml`, `.github/pull_request_template.md`, `CHANGELOG.md` |

Run the exact CI gates locally:
```bash
cd nr-next-marketing
npm run lint && npm run typecheck && npm test && npm run build
```

---

## Hands-On Walkthrough — Day 13 Proven in This Project

### A. All four CI gates pass locally
```
GATE 1 lint       → exit 0 (eslint, incl. jsx-a11y)
GATE 2 typecheck  → exit 0 (next typegen && tsc --noEmit)
GATE 3 test       → Test Files 5 passed (5) · Tests 14 passed (14)
GATE 4 build      → ✓ Compiled successfully
```
**What this proves:** the pipeline is real — the same four commands CI runs all pass,
and the test gate exercises actual code (14 unit tests across 5 files).

### B. The workflows are valid
```
✓ valid YAML: .github/workflows/ci.yml
✓ valid YAML: .github/workflows/deploy.yml
✓ valid YAML: .github/dependabot.yml
CI steps: checkout → setup-node → Install → Lint → Typecheck → Unit tests → Build
```
**What this proves:** the CI job runs the gates in order on PRs + main (path-filtered),
and the deploy job does preview-on-PR / prod-on-main.

### Try-it-yourself experiments
1. **Break a gate:** introduce a type error → `npm run typecheck` (and CI) fail; fix it.
2. **Add a test:** write a failing `*.test.ts` → `npm test` goes red → the merge is
   blocked until fixed.
3. **Preview flow:** push a branch + open a PR → Vercel (native or the workflow) posts a
   preview URL; review the change live before merge.
4. **Rollback drill:** in Vercel, open Deployments → "Promote to Production" on a prior
   deployment → instant rollback, no rebuild.
5. **Cache win:** note the second CI run is faster — `actions/setup-node` cached
   `node_modules` from the lockfile hash.

---

## Self-Check Questions & Answers

**1. Walk me through your branching strategy and how a change reaches production.** *(JD line)*
Trunk-based: I branch a short-lived feature branch off `main`, open a PR, and CI runs
the gates — lint, typecheck, unit tests, and a production build — while a **preview
deploy** spins up a unique URL. Design/marketing review the change on that preview;
once CI is green and reviews are in, I squash-merge to `main`, which triggers the
**production deploy** automatically. Anything risky ships behind a **feature flag**, so
merging isn't releasing — I ramp it (or canary) and can disable it instantly. Notable
changes get a SemVer tag + changelog entry, and rollback is promoting the previous
immutable deployment.

**2. What gates do you put in CI and why that order?**
Lint, typecheck, unit tests, then build — cheapest and fastest-failing first so
developers get feedback quickly and don't wait on a slow build to learn about a lint
error. Lint catches style/a11y issues, typecheck catches type errors (`next typegen &&
tsc --noEmit`), tests catch logic regressions, and the build is the final gate (it also
type-checks and prerenders, catching anything the others missed). All are required by
branch protection before merge, with caching + concurrency cancellation to keep it fast.

**3. Trunk-based vs GitFlow — when each?**
Trunk-based (short-lived branches off `main`, merge frequently, flags for unfinished
work) suits **continuously-deployed web apps** — it minimizes long-lived divergence and
merge conflicts and gets changes out fast. GitFlow (long-lived `develop`/`release`/
`hotfix` branches) suits **versioned/released software** (desktop apps, libraries with
support windows) where you batch releases. For a marketing site, trunk-based + preview
deploys + flags.

**4. How do preview deployments help, and how do they work?**
Every PR gets its own deployed URL with that branch's code (and preview-scoped env
vars), so reviewers, designers, and marketers validate the actual change in a
production-like environment before merge — catching issues review-in-diff misses. On
Vercel it's automatic via the Git integration; the portable equivalent is a CI job
running `vercel pull/build/deploy` on `pull_request`.

**5. How do you manage environment config and secrets across environments?**
Per-environment env vars (Development / Preview / Production), never committed —
injected by the platform (Vercel env vars, or AWS SSM/Secrets Manager) and pulled at
build/deploy time (`vercel pull --environment=…`). Secrets live in the platform/GitHub
secrets, referenced by CI. This lets preview use safe values (e.g. Contentful **Preview**
token, a test analytics ID) while prod uses the real ones — same code, different config.

**6. How do you deploy and roll back safely?**
Prefer immutable deployments: each build is a distinct artifact, so **rollback = promote
the previous deployment** (instant, no rebuild — Vercel does this). Layer canary or
blue-green for big changes (shift a small % of traffic, watch metrics, then ramp or
revert), and use feature flags so you can disable a feature without any deploy. Pair with
monitoring/alerts (Day 15) so you know when to roll back.

**7. How would you deploy this on AWS instead of Vercel?**
Static/ISR assets to **S3 behind CloudFront** (CDN), and the App Router's SSR/Route
Handlers/ISR onto **Lambda@Edge / Lambda** (commonly via the **OpenNext** adapter) or
**Amplify Hosting** for a more turnkey path; heavier workloads on **ECS/Fargate**. CI
(GitHub Actions/CodePipeline) builds and deploys via IaC (CDK/Terraform), with
CloudFront invalidation on release and per-stage env config from SSM/Secrets Manager.
The architecture is the same as Vercel — CDN for static, functions for dynamic — just
assembled explicitly.

---

## Interview Soundbites (tie to your NBA.com / JPMC work)
- *"Trunk-based with short-lived branches: PR → CI gates (lint/typecheck/test/build) +
  a preview deploy for sign-off → squash to main → auto prod deploy. Risky work ships
  behind a flag so merge isn't release."*
- *"CI gates run cheapest-first so failures are fast; the build is the last gate because
  it's the slowest and also type-checks and prerenders."*
- *"Preview-per-PR is the highest-leverage CD feature for marketing — design and
  stakeholders approve the real thing on a live URL before it ever hits prod."*
- *"Rollback is promoting the previous immutable deployment — instant, no rebuild — and
  feature flags give per-feature rollback with no deploy at all."*
