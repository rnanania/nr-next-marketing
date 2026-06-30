# Pace — Senior Front-End Interview Study Project

> A real, runnable **Next.js 16** marketing site, built **day-by-day** to master the
> modern front-end stack (React 19 · Next.js 16 · Tailwind v4 · Contentful) for a
> Senior Front-End role. Brand: **Pace**.

**🔗 Live demo:** [nr-next-marketing.vercel.app](https://nr-next-marketing.vercel.app) ·
**👤 Built by** [Rohit Nanania](https://www.linkedin.com/in/rohit-nanania-a05366b/)

## What this is

Each "day" teaches a topic by building a **genuine, runnable feature** into this one
app — not throwaway snippets — then writing a study doc. Visit the live site and read
the **study note at the bottom of every page** to see which topic it demonstrates, or
browse the [`/metrics`](https://nr-next-marketing.vercel.app/metrics) page for live
Core Web Vitals.

## Getting started

```bash
npm run dev        # local dev (http://localhost:3000)
npm run build      # production build (type-checks + prerenders)
npm run lint       # eslint (incl. full jsx-a11y recommended)
npm run typecheck  # next typegen && tsc --noEmit
npm test           # vitest (unit tests for pure utils)
```

The app runs with **zero credentials** — Contentful, GTM, Marketo, and analytics all
fall back to fixtures. See [`.env.example`](.env.example) to wire real services.

## Deep-dive docs

- [Feature tour](docs/feature_tour.md) — a runnable tour of every Next.js 16 feature in the app
- [Analytics stack](docs/analytics_stack.md) — GTM + Vercel Web Analytics + Speed Insights
- [GTM integration](docs/gtm_integration.md) — consent-gated tag manager, end to end
- [Marketo integration](docs/marketo_integration.md) — lead capture, UTM attribution, server-side submit
- [Vercel deployment](docs/deployment_vercel.md) — hosting, env vars, previews
- Per-day study notes: [`docs/`](docs/) → `dayNN_*.md`

---

# 📚 Study Plan

## Senior Front-End Engineer — Marketing Website (React / Next.js / Tailwind / Contentful)

> Goal: architect, build, deploy, and operate a high-performance marketing site, and
> speak to every part of the stack with depth + a personal story.

## TARGET VERSIONS (current as of June 2026)

Study against these versions — they change defaults and APIs vs. older tutorials.

| Tech | Version | What's new / matters |
|------|---------|----------------------|
| **Next.js** | **16.2** | Turbopack is the default bundler; `params`/`searchParams` are async (Promises); `use cache` directive + Cache Components; Partial Prerendering (PPR); caching is opt-in (uncached by default since 15) |
| **React** | **19.2** | React Compiler (auto-memoization — less `useMemo`/`useCallback`); Actions + `useActionState`/`useFormStatus`/`useOptimistic`; `use()` hook; `ref` as a prop (no `forwardRef`); native document metadata (`<title>`/`<meta>`) |
| **TypeScript** | **6.x stable / 7.0 beta** | 7.0 is a Go-based native compiler (`tsgo`, ~10× faster); same type semantics — learn on 6.x, try `tsgo` in CI |
| **Tailwind CSS** | **v4.3** | CSS-first config via `@theme` (no `tailwind.config.js`); automatic content detection; OKLCH colors; new high-perf engine; container queries & many utilities built in |
| **shadcn/ui** | current | Updated for Tailwind v4 + React 19; `data-slot` for styling; `forwardRef` removed; `sonner` replaces `toast`; `new-york` is the default style |
| **Node.js** | 22 LTS / 24 | Required by Next 16 toolchain |

> ⚠️ Many online tutorials still use Next 13/14 (`tailwind.config.js`, sync params,
> manual memoization, `forwardRef`). Prefer official docs for current APIs.

---

## ROLE → STUDY MAPPING

| JD Requirement | Covered On Day(s) |
|----------------|-------------------|
| React, Next.js, Tailwind — performance & scalability | 1, 2, 3, 4, 6 |
| Pixel-perfect UI, design collaboration, ShadCn/Figma | 7 |
| Third-party services: analytics, CMS, Marketo Forms, A/B testing | 11, 12 |
| Staging & production deployments, reliability & speed | 13, 14 |
| Marketing stakeholder collaboration → technical solutions | 12, 17, 18 |
| Core Web Vitals, SEO, accessibility | 8, 9, 10 |
| Dev/ops workflows: branching, releases, incident response | 13, 15 |
| Cloud computing (AWS / Azure / GCP) | 14 |
| TypeScript, responsive/accessible components | 5, 7, 8 |
| Headless CMS + third-party APIs | 3, 11 |
| CI/CD pipelines | 13 |
| Contentful CMS (3+ yrs) | 11 |
| Design systems: Figma, ShadCn UI | 7 |

---

## SCHEDULE (3 weeks, ~1–1.5 hrs/day)

| Day | Topic | Focus |
|-----|-------|-------|
| 1 | Next.js App Router | Routing, layouts, server vs client components, file conventions |
| 2 | Next.js Rendering | SSR / SSG / ISR, streaming, Suspense, Server Components deep dive |
| 3 | Next.js Data & APIs | Fetching, caching, revalidation, route handlers, server actions, 3rd-party APIs |
| 4 | React (advanced) | Hooks, memoization, composition, error boundaries, performance |
| 5 | TypeScript | Generics, utility types, typing props/hooks/API responses, discriminated unions |
| 6 | Tailwind CSS | Config, design tokens, responsive, dark mode, @apply, performance |
| 7 | Design Systems | ShadCn UI + Radix, Figma-to-code, pixel-perfect, reusable components |
| 8 | Accessibility | WCAG, semantic HTML, ARIA, keyboard nav, focus mgmt, a11y testing |
| 9 | Core Web Vitals | LCP / CLS / INP, image & font optimization, bundle analysis, lazy loading |
| 10 | SEO | Metadata API, structured data (JSON-LD), sitemaps, OG tags, canonical, technical SEO |
| 11 | Contentful / Headless CMS | Content models, Delivery vs Management API, GraphQL, preview, ISR revalidation |
| 12 | Marketing Integrations | GA4/Adobe Analytics, Marketo Forms, A/B testing & feature flags, tag managers |
| 13 | CI/CD & Deployments | Vercel/AWS pipelines, preview/staging/prod, branching strategy, release process |
| 14 | Cloud Computing | AWS/Azure/GCP basics for front-end: hosting, CDN/edge, serverless, secrets |
| 15 | Ops & Reliability | Observability, monitoring, incident response, on-call, rollbacks |
| 16 | System Design | Architecting a scalable marketing site end-to-end |
| 17 | Mock Interview | Technical Q&A across all topics |
| 18 | Mock Interview | Behavioral + stakeholder/marketing collaboration stories |

---

## DAY-BY-DAY DETAIL

### Day 1 — Next.js App Router Foundations (Next.js 16)
- `app/` directory: `layout`, `page`, `loading`, `error`, `not-found`, `template`, route groups, parallel & intercepting routes
- Server Components vs Client Components: defaults, `"use client"` boundary, when each runs, composition rules (passing server data into client components)
- Dynamic routes, **async `params`/`searchParams` (now Promises — must `await`)**, `generateStaticParams`
- **Turbopack** is the default dev/build bundler in 16 — know its behavior
- Metadata basics, `<Link>` prefetching, navigation
- **Build:** `npx create-next-app@latest` and scaffold a multi-page marketing site shell (Home, Product, Pricing, Blog) with shared layout + nav
- **Interview Qs:** "When do you reach for a Client Component?" / "How does App Router differ from Pages Router?" / "What changed with async params in Next 15/16?"

### Day 2 — Rendering Strategies (the heart of a marketing site)
- SSG vs SSR vs ISR vs CSR — pick the right one per marketing page type
- Incremental Static Regeneration: `revalidate`, on-demand revalidation, why it's ideal for CMS-driven marketing content
- **`use cache` directive + Cache Components** (the modern Next 16 caching model — replaces a lot of implicit caching)
- **Partial Prerendering (PPR)** — static shell + streamed dynamic holes; Streaming + Suspense, loading UI
- React Server Components render lifecycle, the RSC payload
- **Build:** make the Blog index ISR-backed, Home SSG, a personalized banner streamed via PPR
- **Interview Qs:** "Marketing edits a page in the CMS — how does it go live without a redeploy?" (→ ISR + on-demand revalidation) / "Explain PPR and `use cache`."

### Day 3 — Data Fetching, Caching & Third-Party APIs
- **Caching is opt-in since Next 15** — `fetch` is uncached by default; understand the shift from older "cached-by-default" tutorials
- `use cache` + `cacheLife`/`cacheTag`, `revalidateTag`/`revalidatePath`, `fetch` cache options
- Route Handlers (`route.ts`), Server Actions, form handling/mutations
- Integrating third-party REST/GraphQL APIs; secrets and server-only code (`server-only`)
- Error/retry handling, request memoization
- **Build:** a route handler that proxies a 3rd-party API; tag-based revalidation
- **Interview Qs:** "Explain Next.js caching layers and how you'd debug stale data." / "What changed about caching defaults in Next 15/16?"

### Day 4 — React Advanced & Performance (React 19)
- **React Compiler** — auto-memoizes; understand how it reduces the need for manual `useMemo`/`useCallback` (and when you still reach for them)
- **Actions + new hooks:** `useActionState`, `useFormStatus`, `useOptimistic`, and the `use()` hook for reading promises/context
- **`ref` as a prop** — `forwardRef` no longer needed; native document metadata (`<title>`/`<meta>` in components)
- Re-render model, reconciliation, keys, `memo`; `useTransition`/`useDeferredValue`
- Composition patterns, compound components, context vs props, error boundaries
- **Build:** an interactive component (filterable card grid) + a form using Actions/`useActionState`/`useOptimistic`
- **Interview Qs:** "How do you diagnose a slow React page?" / "What does the React Compiler change about how you optimize?"

### Day 5 — TypeScript for React/Next (TS 6.x, eye on 7.0)
- Generics, utility types (`Partial`, `Pick`, `Omit`, `Record`), `as const`, narrowing, discriminated unions
- Typing props, children, event handlers, hooks, and API/CMS response shapes
- Typed `fetch` wrappers; zod for runtime validation of CMS/API payloads
- **TypeScript 7.0 (native, Go-based `tsgo`)** — ~10× faster, same semantics; know it exists and how to try it in CI alongside 6.x
- **Build:** strongly type the Contentful content model + a generic `<Section>` renderer
- **Interview Qs:** "How do you keep CMS data type-safe end to end?" / "What's the TS 7 native compiler about?"

### Day 6 — Tailwind CSS in Depth (v4)
- **v4 CSS-first config:** `@theme` in CSS (no `tailwind.config.js`), `@import "tailwindcss"`, theme as CSS variables, runtime theme switching
- **Automatic content detection** (no `content` array); new high-perf engine; **OKLCH** color system
- Responsive breakpoints, **built-in container queries**, dark mode, state variants, `group`/`peer`
- `@apply`, `@utility`, `cn()`/clsx/tailwind-merge, avoiding class bloat
- Production CSS size, performance
- **Build:** a responsive hero + feature grid pixel-matched to a mock, themed via `@theme`
- **Interview Qs:** "What changed in Tailwind v4?" / "How do you keep a Tailwind codebase consistent and small at scale?"

### Day 7 — Design Systems: ShadCn UI, Radix & Figma
- ShadCn philosophy (copy-in components, not a dependency), Radix primitives, accessibility built-in
- **Current shadcn:** updated for Tailwind v4 + React 19, `data-slot` styling hooks, **no `forwardRef`**, `sonner` (toast deprecated), `new-york` default style, CLI inits Tailwind v4
- Building a reusable, themeable component library; variants with `cva`
- Figma → code workflow, reading specs, tokens, spacing/typography scales, pixel-perfect QA
- Storybook for component docs/visual testing
- **Build:** `npx shadcn@latest init`; add Button/Dialog/Form + `sonner`, theme via `@theme`, document in Storybook
- **Interview Qs:** "Designer hands you a Figma file — walk me through to production-ready, accessible components."

### Day 8 — Accessibility (WCAG / A11y)
- WCAG 2.2 A/AA, POUR principles, semantic HTML first
- ARIA roles/states (and when NOT to use ARIA), landmarks, headings
- Keyboard navigation, focus management/trapping, skip links, visible focus
- Color contrast, reduced motion, forms/labels/errors
- Testing: axe, Lighthouse, screen readers (VoiceOver), eslint-plugin-jsx-a11y
- **Build:** audit & fix the marketing site to AA
- **Interview Qs:** "How do you ensure accessibility across all pages?" (a direct JD line)

### Day 9 — Core Web Vitals & Performance
- LCP, CLS, INP (and FCP/TTFB): what they measure, good thresholds, common causes
- `next/image` (sizing, priority, formats), `next/font`, preloading, lazy loading
- Bundle analysis (`@next/bundle-analyzer`), code splitting, dynamic imports, RSC to ship less JS
- Caching/CDN, edge, third-party script management (`next/script` strategies)
- Lab vs field data (Lighthouse vs CrUX/RUM)
- **Build:** measure & improve CWV; cut a render-blocking script
- **Interview Qs:** "How do you drive Core Web Vitals scores up?" (a direct JD line)

### Day 10 — SEO for Next.js
- Metadata API (static + `generateMetadata`), titles/descriptions, canonical URLs
- Structured data / JSON-LD, Open Graph & Twitter cards, `sitemap.ts`, `robots.ts`
- Indexability, SSR/SSG for crawlers, internationalized routing/hreflang
- Technical SEO: redirects, 404/410, performance ↔ SEO link
- **Build:** add full metadata + JSON-LD + sitemap to the site
- **Interview Qs:** "What SEO best practices do you bake into a Next.js marketing site?"

### Day 11 — Contentful & Headless CMS (HIGH PRIORITY — JD wants 3+ yrs)
- Headless CMS concept; Contentful spaces, environments, content types/models, references, rich text
- Content Delivery API vs Content Management API vs Preview API; GraphQL API
- Localization, draft/preview workflows, scheduled publishing, roles/permissions
- Next.js integration: typed content, image transforms, **on-demand ISR revalidation via webhooks**, draft mode
- Modeling for marketers: reusable components/blocks, page builder pattern
- **Build:** model a "Landing Page" with flexible content blocks; render via a block resolver; wire a publish webhook → revalidate
- **Interview Qs:** "Design a content model that lets marketing build pages without engineering." / "Contentful vs other headless CMSs?"
- **Note:** Compare Contentful with Contentstack/Sanity so you can speak to trade-offs even if your hands-on was another CMS.

### Day 12 — Marketing Integrations & Experimentation
- Analytics: GA4, Adobe Analytics, event/data layer, consent/privacy (GDPR/CCPA), cookie banners
- Tag management: Google Tag Manager, loading strategy, performance impact
- **Marketo Forms**: embedding, styling, custom submit handling, lead capture, hidden fields/UTMs
- A/B testing & feature flags: Optimizely/VWO/LaunchDarkly/Vercel flags, server vs client experiments, avoiding CLS/flicker
- Attribution, UTM handling, campaign landing pages
- **Build:** add GTM + a Marketo form + a simple flag-gated variant
- **Interview Qs:** "How do you run an A/B test without hurting CWV?" / "How do you integrate Marketo Forms cleanly?"

### Day 13 — CI/CD, Deployments & Branching
- Deployment targets: Vercel (preview/prod, env vars, edge) and AWS (Amplify/S3+CloudFront/ECS)
- CI/CD pipelines: GitHub Actions — lint/test/build/typecheck gates, preview deploys per PR
- Branching strategies: trunk-based vs GitFlow, feature branches, environments (dev/staging/prod)
- Release process: semantic versioning, changelogs, blue-green/canary, rollbacks, feature flags for safe release
- **Build:** a GitHub Actions workflow (lint+test+build) + a Vercel preview flow
- **Interview Qs:** "Walk me through your branching strategy and how a change reaches production." (direct JD line)

### Day 14 — Cloud Computing Fundamentals (JD basic qual)
- Core model: compute, storage, networking, IAM, regions/AZs
- Front-end-relevant services: static hosting, CDN/edge (CloudFront, Azure CDN, Cloud CDN), serverless (Lambda/Functions), object storage (S3), DNS, certificates
- Secrets management, environment config, cost basics
- Pick AWS as primary (you have AWS experience) and know Azure/GCP equivalents
- **Build:** sketch how the marketing site is hosted + cached on AWS
- **Interview Qs:** "How would you host and scale this site on AWS?"

### Day 15 — Operations, Reliability & Incident Response
- Observability: logging, metrics, tracing (Sentry, OpenTelemetry, New Relic), RUM
- Alerting/SLOs, error budgets, uptime monitoring
- Incident response: detection → triage → mitigation → rollback → postmortem; MTTR
- On-call practices, runbooks, blameless postmortems
- **Build:** wire Sentry + define a simple incident runbook for the site
- **Interview Qs:** "A campaign launch page is throwing errors in prod — walk me through your response." (JD: incident response time)

### Day 16 — System Design: Scalable Marketing Site
- End-to-end architecture: Next.js + Contentful + CDN/edge + analytics + forms + experiments
- Scalability for traffic spikes (campaigns/launches): caching layers, ISR, edge, CDN
- Multi-environment, preview/draft, localization, performance budgets
- Trade-offs: SSG vs ISR vs SSR per page; build times at scale; cache invalidation
- **Exercise:** whiteboard "Design the target company's marketing website"
- **Interview Qs:** "Design a high-traffic, CMS-driven marketing site that marketers can self-serve."

### Day 17 — Mock Interview: Technical
- Rapid-fire across Days 1–16; live-code a component; debug a caching/CWV scenario
- Explain trade-offs out loud; tie each answer back to your real experience (e.g. NBA.com / JPMC)

### Day 18 — Mock Interview: Behavioral & Stakeholder Stories
- STAR stories: partnering with design (pixel-perfect), partnering with marketing (campaign → tech),
  driving CWV/SEO/a11y, owning a release/incident, mentoring/code reviews
- Prep 6–8 stories mapped to JD responsibilities; questions to ask the interviewer

---

## PROGRESS TRACKER

- [x] Day 1  — Next.js App Router Foundations            → [day01_nextjs_app_router.md](docs/day01_nextjs_app_router.md)
- [x] Day 2  — Next.js Rendering (SSR/SSG/ISR/streaming) → [day02_nextjs_rendering.md](docs/day02_nextjs_rendering.md)
- [x] Day 3  — Data Fetching, Caching & 3rd-Party APIs   → [day03_nextjs_data_caching.md](docs/day03_nextjs_data_caching.md)
- [x] Day 4  — React Advanced & Performance              → [day04_react_advanced_perf.md](docs/day04_react_advanced_perf.md)
- [x] Day 5  — TypeScript for React/Next                 → [day05_typescript.md](docs/day05_typescript.md)
- [x] Day 6  — Tailwind CSS in Depth                     → [day06_tailwind.md](docs/day06_tailwind.md)
- [x] Day 7  — Design Systems: ShadCn, Radix, Figma      → [day07_design_systems_shadcn.md](docs/day07_design_systems_shadcn.md)
- [x] Day 8  — Accessibility (WCAG / A11y)               → [day08_accessibility.md](docs/day08_accessibility.md)
- [x] Day 9  — Core Web Vitals & Performance             → [day09_core_web_vitals.md](docs/day09_core_web_vitals.md)
- [x] Day 10 — SEO for Next.js                           → [day10_seo.md](docs/day10_seo.md)
- [x] Day 11 — Contentful / Headless CMS                 → [day11_contentful_cms.md](docs/day11_contentful_cms.md)
- [x] Day 12 — Marketing Integrations & A/B Testing      → [day12_marketing_integrations.md](docs/day12_marketing_integrations.md)
- [x] Day 13 — CI/CD, Deployments & Branching            → [day13_cicd_deployments.md](docs/day13_cicd_deployments.md)
- [ ] Day 14 — Cloud Computing Fundamentals              → day14_cloud_computing.md
- [ ] Day 15 — Ops, Reliability & Incident Response      → day15_ops_incident_response.md
- [ ] Day 16 — System Design: Marketing Site             → day16_system_design.md
- [ ] Day 17 — Mock Interview: Technical                 → day17_mock_technical.md
- [ ] Day 18 — Mock Interview: Behavioral + Stakeholder  → day18_mock_behavioral.md

> **Bonus —** [`feature_tour.md`](docs/feature_tour.md): a hands-on, runnable tour of all
> the Next.js 16 features in this app (rendering modes, PPR, edge A/B, Cache
> Components, Server Actions, SEO-as-code, CMS boundary), each proven live with
> browser / `curl` / Vercel checks. Great for a fast end-to-end refresher.

---

## KEY RESOURCES
- Next.js 16 docs (App Router, Caching/`use cache`, PPR, Rendering) — nextjs.org/docs ; upgrade guide: nextjs.org/docs/app/guides/upgrading/version-16
- React 19 docs — react.dev ; React Compiler docs
- TypeScript docs — typescriptlang.org ; TS 7 native preview: `@typescript/native-preview` (`tsgo`)
- Tailwind v4 docs — tailwindcss.com/docs (v4 upgrade guide for `@theme`)
- shadcn/ui — ui.shadcn.com (Tailwind v4 + React 19 pages) ; Radix — radix-ui.com
- Contentful developer docs + Next.js integration guide
- web.dev (Core Web Vitals, performance, SEO, a11y)
- WCAG 2.2 Quick Reference — w3.org/WAI/WCAG22/quickref
