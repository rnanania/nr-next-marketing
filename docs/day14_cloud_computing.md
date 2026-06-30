# Day 14 — Cloud Computing Fundamentals

> Target: Next **16.2**, deployed on **Vercel**. Build task: **sketch how the
> marketing site is hosted + cached on AWS** — as a real, runnable `/architecture`
> page in the app. Theme: know the cloud model well enough to answer the JD's
> *"How would you host and scale this site on AWS?"* with depth, mapping every layer
> of this site to AWS / Azure / GCP primitives.

## Recap
| Topic | One-liner |
|---|---|
| **Static-first hosting** | Prerendered HTML lives on a CDN; the edge absorbs traffic, only cache misses hit compute. |
| **CDN / edge** | A global network of PoPs that cache content close to users (Vercel Edge ≈ CloudFront). |
| **Serverless compute** | Functions that run on demand, no servers to manage, billed per-invocation (Vercel Functions ≈ Lambda). |
| **Edge compute** | Code that runs at the CDN edge *before* render — A/B, redirects, geo (proxy.ts ≈ Lambda@Edge). |
| **Object storage** | Durable blob storage for assets/static output (S3 / Blob / Cloud Storage). |
| **Secrets management** | Server-only config injected at build/runtime, never in the client bundle (env vars ≈ Secrets Manager / SSM). |
| **IAM** | Identity & access — who/what can do what (least privilege). |
| **Regions / AZs** | Geographic regions made of isolated availability zones for latency + resilience. |

### Abbreviations
| Short | Full form |
|---|---|
| **CDN** | Content Delivery Network |
| **PoP** | Point of Presence (an edge location) |
| **AZ** | Availability Zone |
| **IAM** | Identity & Access Management |
| **ACM / SSM** | AWS Certificate Manager / Systems Manager (Parameter Store) |
| **ISR / PPR** | Incremental Static Regeneration / Partial Prerendering (Days 2) |

---

## 1. The core cloud model
Every cloud (AWS/Azure/GCP) is the same five primitives: **compute** (run code),
**storage** (keep bytes), **networking** (move bytes + DNS + TLS), **identity/IAM**
(who can do what), and **regions/AZs** (where it runs). A front-end engineer mostly
touches: static hosting, CDN/edge, serverless functions, object storage, DNS, certs,
and secrets — the rest the platform manages.

## 2. Static-first is the whole game for marketing sites
The cheapest, most scalable byte is one served from a **CDN cache** — no compute, no
database, answered from a PoP near the user in milliseconds. So we prerender as much
as possible (SSG/PPR) and let the edge serve it. A campaign launch that 100×'s
traffic mostly hits cache; only **cache misses** reach a function. That's the scaling
answer: the CDN is the load shield.

## 3. How this site maps to cloud primitives
| Concern | This app (Vercel) | AWS | Azure | GCP |
|---|---|---|---|---|
| Static hosting + CDN | Vercel Edge Network | S3 + CloudFront | Blob + Front Door | Cloud Storage + Cloud CDN |
| Serverless compute | Vercel Functions | Lambda | Azure Functions | Cloud Run / Functions |
| Edge compute | `proxy.ts` | Lambda@Edge / CF Functions | Front Door Rules | Cloud Functions (edge) |
| DNS | Vercel DNS | Route 53 | Azure DNS | Cloud DNS |
| TLS / certs | Automatic | ACM | App Service Certs | Google-managed |
| Secrets / config | Project env vars | Secrets Manager / SSM | Key Vault | Secret Manager |
| Identity / access | Vercel team roles | IAM | Entra ID / RBAC | Cloud IAM |
| Observability | Analytics / Logs | CloudWatch | Azure Monitor | Cloud Monitoring |

## 4. The request path (what actually happens)
```
Visitor → DNS → CDN/Edge PoP ──cache HIT→ static HTML in ms (no compute)
                    │ cache MISS / dynamic hole
                    ▼
            Serverless function (a region) → RSC render, Server Actions,
            route handlers, ISR regeneration → Contentful / 3rd-party APIs
```
The **edge proxy** (`proxy.ts`) runs *before* render for A/B + UTM (Day 12), so the
right variant is in the HTML with no flicker — that's edge compute.

## 5. Secrets, env & cost
- **Secrets**: server-only (`server-only` + non-`NEXT_PUBLIC_` env). On AWS you'd pull
  from Secrets Manager / SSM at runtime via an IAM role — never bake into the bundle.
- **Env config**: per-environment (production/preview/development) — Vercel injects
  `VERCEL_ENV`, `VERCEL_GIT_COMMIT_SHA`, `VERCEL_REGION`; AWS uses env + Parameter Store.
- **Cost**: static/CDN is cheap (bytes); serverless is per-invocation; ISR cuts origin
  load; image optimization is cached. Static-first keeps the bill flat under spikes.

## Build Exercise
| What | Where |
|---|---|
| A real `/architecture` page (static shell + diagram + cloud-equivalence table + "how this maps") | `src/app/(marketing)/architecture/page.tsx` |
| A **live edge island** proving the CDN edge is real — reads request-time geo headers in a `<Suspense>` hole (PPR) | same file, `<EdgeInfo>` |
| Deployment facts from Vercel system env (build-time) | same file, `env`/`commit`/`buildRegion` |
| Discoverable in nav + per-page study note | `src/components/site-header.tsx`, `src/lib/study-notes.ts` |

## Hands-On Walkthrough (proven)
**Build — the route is PPR (static shell + dynamic edge hole):**
```
$ npm run build
├ ◐ /architecture                                 1d      1w
◐  (Partial Prerender)  prerendered as static HTML with dynamic server-streamed content
```

**Served HTML (`npm run start` + curl) — static content prerendered:**
```
$ curl -s localhost:3000/architecture | grep -oE "Architecture &amp; Hosting"
Architecture &amp; Hosting
$ curl -s localhost:3000/architecture | grep -oE "Lambda@Edge|CloudFront|Secrets Manager" | sort -u
CloudFront
Lambda@Edge
Secrets Manager
```

**The edge island — honest local fallback (no Vercel edge headers locally):**
```
$ curl -s localhost:3000/architecture | grep -oE "Running locally — no edge geo headers"
Running locally — no edge geo headers
```

**Couldn't run here (no Vercel, no headless browser):** the live geo readout
(`x-vercel-ip-*` only exists on Vercel's edge) and the real `Environment`/`Commit`/
`Build region` values (populate from Vercel system env on deploy). Locally these show
`local` / `—` by design — the page states this explicitly.

## Try-it-yourself
- Deploy and open `/architecture` — the edge box should name the CDN PoP city nearest
  you, and the deployment facts should show `production` + the commit SHA.
- Open it from a VPN in another country — watch the edge geo change.
- Trace one request in DevTools → Network: the `x-vercel-cache` response header shows
  `HIT`/`MISS` (the CDN cache in action).

## Self-Check Q&A
- **"How would you host and scale this site on AWS?"** (JD) → S3 (static output) +
  CloudFront (CDN) for the static-first shell; Lambda@Edge / CloudFront Functions for
  the edge proxy (A/B, UTM); Lambda (+ API Gateway) for Server Actions/route handlers;
  Route 53 for DNS; ACM for TLS; Secrets Manager/SSM for tokens; CloudWatch for logs.
  Tooling: AWS Amplify Hosting or OpenNext/SST to deploy Next.js onto that stack.
  The scaling story: static-first → CDN absorbs spikes, only misses hit Lambda.
- **"Static vs serverless — when does compute run?"** → Only on a cache miss or for a
  dynamic hole (PPR). Static pages are pure CDN reads.
- **"Where do secrets live?"** → Server-only env / Secrets Manager, pulled via an IAM
  role; never in `NEXT_PUBLIC_*` or the client bundle.
- **"What's edge compute and why use it here?"** → Code at the CDN PoP before render;
  we use it (`proxy.ts`) so A/B assignment is in the HTML — no client flicker / CLS.

## Interview Soundbites
- *"I think static-first: prerender to the CDN so a campaign spike hits cache, not
  compute. On NBA.com, traffic was spiky and event-driven — caching at the edge is
  what keeps a marketing site fast and cheap under load."*
- *"I map cleanly between Vercel and AWS — Edge Network↔CloudFront, Functions↔Lambda,
  proxy↔Lambda@Edge, env↔Secrets Manager. At JPMC the secrets discipline mattered:
  server-only, IAM-scoped, never in the bundle."*
- *"The `/architecture` page in this app is the answer made runnable — it even reads
  Vercel's edge geo headers live to show which PoP served you."*
