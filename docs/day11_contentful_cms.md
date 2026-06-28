# Day 11 — Contentful & Headless CMS (HIGH PRIORITY)

> Target: Next **16.2**, Contentful (Delivery/Preview GraphQL). Build task: **model
> a Landing Page with flexible content blocks; render via a block resolver; wire a
> publish webhook → revalidate**, plus **draft mode** preview. The JD wants 3+ yrs of
> Contentful — this is the day to be fluent.
>
> Runs with **zero credentials**: a local fixture mirrors Contentful's GraphQL
> response shape, so the real integration code (fetch → map → validate) is exercised
> identically. Set the env vars to point at a real space.

## Recap
| Term | One-liner |
|---|---|
| **Headless CMS** | Content store + API, **no presentation** — you render it with any front end (vs WordPress's coupled theme). |
| **Space / Environment** | A space is a project; environments (`master`, `staging`) are isolated copies of content + models. |
| **Content Type** | The schema/model for an entry (fields + validations) — e.g. `LandingPage`, `HeroBlock`. |
| **Entry / Asset** | An instance of a content type / a media file (image, video). |
| **Reference** | A field linking one entry to others — how a page references its blocks (the page-builder). |
| **Rich Text** | Structured (JSON) rich content, not HTML — rendered with a resolver. |
| **Delivery / Preview / Management API** | Read published / read drafts / write content. |

### Abbreviations
| Short | Full form |
|---|---|
| **CDA** | Content Delivery API (published, read-only, CDN-cached) |
| **CPA** | Content Preview API (includes drafts, read-only) |
| **CMA** | Content Management API (read/write, for tooling/migrations) |
| **ISR** | Incremental Static Regeneration (Day 2) |
| **DU** | Discriminated Union (the block model, Day 5) |

---

## 1. The Contentful model

A **space** holds **content types** (models) and **entries** (content). Marketers
edit entries; engineers define types. The power move for a marketing site is the
**page-builder / block pattern**: a `LandingPage` type has a `blocks` **reference
list** to a *union* of block types (`HeroBlock`, `FeatureListBlock`, `CtaBlock`,
`RichTextBlock`). Marketers compose pages by adding/reordering blocks — **no
engineering per page**. **Environments** (`master` vs `staging`) let you test model
changes safely; **localization** stores per-locale field values; **roles/permissions**
and **scheduled publishing** control who ships what, when.

---

## 2. The three APIs (know which, when)

| API | Reads | Use |
|---|---|---|
| **CDA** (Delivery) | **published** only, CDN-cached, fast | production reads |
| **CPA** (Preview) | published **+ drafts** | preview/draft mode for editors |
| **CMA** (Management) | everything, **read/write** | migrations, import scripts, automation |

REST **or** **GraphQL** for reads. GraphQL is ideal for the block pattern: one query
fetches the page + its block union with `__typename` per member:

```graphql
landingPageCollection(where: { slug: $slug }, preview: $preview, limit: 1) {
  items { slug title
    blocksCollection { items {
      __typename
      ... on HeroBlock { sys { id } heading subheading ctaLabel ctaHref }
      ... on FeatureListBlock { sys { id } title itemsCollection { items { name description } } }
      ... on CtaBlock { sys { id } text href variant }
    } } } }
```

`preview: $preview` + the **preview token** switches the same query from CDA→CPA.

---

## 3. Type-safe integration: Contentful → map → validate → render

Contentful is **untrusted input** (the model can change, fields can be null), so we
parse at the boundary (Day 5 pattern). The pipeline:

```
Contentful GraphQL  →  mapLandingPage()  →  zod validate  →  <BlockRenderer>
(sys/__typename/      (CMS shape → flat    (parse against    (exhaustive
 nested collections)   internal Block union) landingPageSchema) Section resolver)
```

```ts
// lib/cms/contentful.ts
const { isEnabled: preview } = await draftMode();
const raw  = await queryContentful("ship-faster", preview);   // CDA or CPA
const page = validate(landingPageSchema, mapLandingPage(raw), "landing"); // typed + safe
```

The mapper turns `__typename`/`sys.id`/`...Collection` into our flat block union, so
the renderer (Day 5/7) never sees Contentful's wire shape. Type safety end to end:
the zod schema is the single source of truth for both the runtime check and the TS type.

---

## 4. Draft Mode (preview) — CDA vs CPA at runtime

Next's **Draft Mode** flips a page from published to draft content per request:

```ts
// /api/preview?secret=…   → draft.enable()  (sets __prerender_bypass cookie) → redirect
// /api/preview/disable     → draft.disable()
const draft = await draftMode();
draft.enable();
```

The loader reads `draftMode().isEnabled` to choose the **Preview token** (drafts) vs
**Delivery token** (published). Crucial Next 16 detail: `isEnabled` **is** readable
inside a `use cache` scope, and when draft mode is on, that scope **re-executes every
request and isn't cached** — so the published page stays static/ISR, while editors
always see fresh drafts. One loader, both behaviors.

---

## 5. On-demand ISR revalidation via webhook (the headline pattern)

Time-based ISR isn't enough — marketers want changes **live on publish**. Wire a
Contentful **webhook** (on Publish/Unpublish) to a Route Handler that invalidates by
tag:

```
Editor clicks Publish
   → Contentful webhook  POST /api/revalidate?secret=…&tag=cms
   → revalidateTag("cms", "max")
   → next visitor to /landing (loader tagged "cms") gets fresh content — no redeploy
```

The loader is `use cache` + `cacheTag("cms")`; the webhook (Day 3) revalidates that
tag. Prefer **tags** over paths so one publish can refresh every page using that
content. This is the answer to *"marketing edits a page — how does it go live without
a deploy?"*

---

## 6. Image transforms (Contentful Images API + next/image)

Contentful serves assets from `images.ctfassets.net` and transforms them via query
params (`?w=&h=&q=&fm=&fit=`). A custom `next/image` loader pushes the resize/format
work to Contentful's edge:

```ts
export function contentfulLoader({ src, width, quality }: ImageLoaderProps) {
  const url = new URL(src);
  url.searchParams.set("w", String(width));
  url.searchParams.set("q", String(quality ?? 75));
  url.searchParams.set("fm", "avif");       // modern format → smaller, better LCP
  return url.toString();
}
// <Image loader={contentfulLoader} src={asset.url} … />
```

Combined with Day 9's `next/image`, you get responsive, AVIF, CDN-resized CMS images.

---

## 7. Contentful vs Sanity vs Contentstack

| | **Contentful** | **Sanity** | **Contentstack** |
|---|---|---|---|
| Model | UI-defined content types; references; environments | Code-defined schema (`schema.ts`); very flexible | UI-defined; enterprise-focused |
| APIs | CDA/CPA/CMA, **REST + GraphQL** | GROQ query language + GraphQL | REST + GraphQL |
| Editing | Polished web app; roles, scheduling, localization | **Sanity Studio** (customizable, real-time) | Enterprise workflows, approvals |
| Preview | Preview API + draft mode | Real-time/live preview is a strength | Preview + workflows |
| Sweet spot | Marketing teams wanting a turnkey, governed CMS | Dev-heavy teams wanting full control/customization | Large enterprises, compliance |

Talking point: I'd pick **Contentful** when marketers need a governed, turnkey editor
(roles, scheduling, localization) and engineers want stable typed APIs; **Sanity** when
the team wants a code-defined schema and a deeply customizable studio with real-time
preview. The *integration pattern* (fetch → map → validate → resolver, webhook
revalidation, draft mode) is the same regardless.

---

## Build Exercise — ✅ BUILT & RUNNING

Added to the Day 1–10 project (builds on the Day 5 page-builder):

| Concept | Where |
|---|---|
| Contentful client (CDA/CPA GraphQL) + fixture fallback | `src/lib/cms/contentful.ts` |
| Contentful GraphQL response fixtures (published + draft) | `src/lib/cms/fixtures.ts` |
| Entry → block **mapper** + zod **validation** | `src/lib/cms/contentful.ts`, `content.ts` |
| **Draft Mode** enable/disable | `src/app/api/preview/route.ts`, `…/preview/disable/route.ts` |
| Preview banner + "Exit preview" | `src/app/(marketing)/landing/page.tsx` |
| **Webhook revalidation** (`cms` tag) | `src/app/api/revalidate/route.ts` (Day 3) |
| **Image transform** loader (Images API) | `src/lib/cms/image.ts` + `next.config.ts` remotePatterns |
| Env template | `.env.example` |

Run it:
```bash
cd c1_study/c1-marketing
npm run dev
# published:  /landing
# preview:    /api/preview?secret=dev-secret   → /landing (drafts + banner)
# exit:       /api/preview/disable
# publish:    curl -X POST "localhost:3000/api/revalidate?secret=dev-secret&tag=cms"
```

---

## Hands-On Walkthrough — Day 11 Proven in This Project

### A. Published vs Preview are different content
```
PUBLISHED /landing (no cookie): title "(DRAFT)" present: 0 · preview banner: 0
ENABLE  /api/preview?secret=NOPE        → 401 (bad secret)
ENABLE  /api/preview?secret=dev-secret  → sets __prerender_bypass draft cookie
PREVIEW /landing (with cookie): title "(DRAFT)": yes · banner: yes · draft-only block: yes
```
**What this proves:** the same page serves CDA (published) content by default and CPA
(draft) content under Draft Mode — gated by a secret-protected route — with the extra
unpublished block visible only in preview.

### B. /landing stays static when published
```
○ /landing   1h   1d        ← still statically prerendered + ISR (cacheTag "cms")
```
**What this proves:** reading `draftMode()` inside `use cache` doesn't force the page
dynamic — production stays fast/static; only the draft cookie makes it re-execute.

### C. Publish webhook revalidates by tag
```
POST /api/revalidate?secret=dev-secret&tag=cms → {"revalidated":true,"tag":"cms"}
```
**What this proves:** a Contentful publish event can refresh the landing page on demand
(stale-while-revalidate), no redeploy — the loader is tagged `cms`.

### D. Contentful response is mapped + validated to typed blocks
The GraphQL shape (`__typename`, `sys.id`, nested `...Collection`) is mapped to our
flat block union and parsed by `landingPageSchema` before rendering — so a malformed or
renamed field throws at the boundary instead of corrupting the UI.

### E. Image transform URLs
```
contentfulLoader(w=800,q=70) → …/hero.jpg?w=800&q=70&fm=avif&fit=fill
ctfImageUrl(w=1200,h=630,webp) → …/hero.jpg?w=1200&h=630&q=75&fm=webp
```
**What this proves:** images are resized/reformatted by Contentful's edge, sized per
breakpoint via `next/image`.

### Try-it-yourself experiments
1. **Toggle preview:** visit `/api/preview?secret=dev-secret` → `/landing` shows the
   `(DRAFT)` title, amber banner, and the 🚧 draft-only block; click "Exit preview".
2. **Publish flow:** with `/landing` open, POST the revalidate webhook → reload twice →
   fresh content (SWR, Day 3).
3. **Add a block type:** add a `quote` block to `schema.ts` + the mapper + the resolver;
   the exhaustiveness check (Day 5) forces you to handle it everywhere.
4. **Point at a real space:** set `CONTENTFUL_SPACE_ID` + tokens in `.env.local` → the
   loader hits the real GraphQL API instead of the fixture, unchanged.
5. **Break the data:** make a fixture block drop a required field → `validate()` throws
   "Invalid landing" instead of rendering broken UI.

---

## Self-Check Questions & Answers

**1. Design a content model that lets marketing build pages without engineering.**
A **page-builder**: a `LandingPage` content type with a `blocks` reference field to a
**union of block types** (Hero, FeatureList, CTA, RichText, …), each a small, reusable
content type with its own fields and validations. Marketers compose a page by
adding/reordering blocks and filling fields — no code per page. Engineers maintain the
block types and a **block resolver** that maps each block to a component (an exhaustive
switch over the discriminated union, so adding a type forces a renderer). Add shared
reusable entries (referenced from multiple pages), localization for fields, and use
environments to evolve the model safely. The result: governed flexibility — marketers
self-serve within guardrails engineers define.

**2. CDA vs CPA vs CMA?**
**CDA** (Delivery) is read-only, **published** content, CDN-cached — production reads.
**CPA** (Preview) is read-only but includes **drafts** — used for editor preview/draft
mode (different token, same query with `preview: true`). **CMA** (Management) is
read/write — for migrations, imports, and automation, not request-path reads. You read
the site with CDA/CPA and never expose the CMA token to the front end.

**3. How does a CMS edit go live without a redeploy?**
On-demand ISR via webhook. Cached data is tagged (`cacheTag("cms")`); a Contentful
**Publish** webhook calls a Route Handler that runs `revalidateTag("cms", "max")`. The
next visitor gets fresh content with stale-while-revalidate — no build, no deploy. Tags
beat paths because one publish refreshes every page that uses that content.

**4. How do you implement preview/draft mode in Next.js?**
Next **Draft Mode**: a secret-protected Route Handler calls `draftMode().enable()` (sets
the bypass cookie) and redirects to the page; another route calls `disable()`. The data
loader reads `draftMode().isEnabled` and chooses the **Preview API** token (drafts) vs
**Delivery API** (published). In Next 16 `isEnabled` is readable inside `use cache`, and
draft mode bypasses the cache per request — so production stays static while editors see
live drafts.

**5. How do you keep CMS content type-safe?**
Treat the CMS as untrusted input: define the model once as a zod schema, infer the TS
type from it, **map** the CMS wire shape (Contentful's `__typename`/`sys`/collections)
to your internal block union, then **parse** with zod at the boundary. After a
successful parse the rest of the app trusts the type; a renamed/removed field throws a
clear error instead of rendering broken UI. (GraphQL codegen or `contentful` types are
complementary, but runtime validation is what protects you when editors change things.)

**6. Contentful vs other headless CMSs?**
Contentful: UI-defined content types, environments, CDA/CPA/CMA over REST+GraphQL, and a
governed editor (roles, scheduling, localization) — great when marketers want turnkey
self-service. Sanity: code-defined schemas, the GROQ query language, and a highly
customizable real-time Studio — great for dev-heavy teams wanting control and live
preview. Contentstack: enterprise workflows/approvals at scale. The Next integration
pattern (fetch → map → validate → resolver + webhook revalidation + draft mode) is the
same; the choice is about editing experience and governance vs developer flexibility.

**7. How do you handle CMS images performantly?**
Use the CMS's image API for edge transforms (Contentful Images API: `?w&h&q&fm&fit`) via
a custom `next/image` loader, so images are resized and served as AVIF/WebP per
breakpoint without bundling originals — combining the CMS CDN with Day 9's `next/image`
(responsive `srcset`, lazy by default, `priority` for the LCP image).

---

## Interview Soundbites (tie to your NBA.com / JPMC work)
- *"I model marketing pages as a Contentful page-builder — a LandingPage with a block
  reference union — so marketers compose and reorder blocks without engineering, and a
  block resolver maps each to a component."*
- *"CMS data is untrusted, so I fetch over GraphQL, map Contentful's shape to an internal
  block union, and validate with zod at the boundary — type-safe end to end, and a
  renamed field fails loudly instead of breaking the page."*
- *"Publishing is instant without a deploy: content is cache-tagged and a Contentful
  publish webhook calls `revalidateTag`, so the next visitor sees fresh content with
  stale-while-revalidate."*
- *"Editors get live preview via Next Draft Mode switching the Delivery API for the
  Preview API — and because production reads stay cached/static, preview doesn't cost
  performance."*
