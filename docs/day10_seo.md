# Day 10 — SEO for Next.js

> Target: Next **16.2**, the Day 1–9 site. Build task: **add full metadata +
> JSON-LD + sitemap.** Theme: make the site maximally crawlable, indexable, and
> rich-result-eligible — the payoff of all the SSR/SSG/performance work.

## Recap
| Topic | One-liner |
|---|---|
| **Metadata API** | Export `metadata` (static) or `generateMetadata` (dynamic) → Next renders `<title>`, `<meta>`, `<link>`. |
| **`metadataBase`** | The origin used to make relative canonical/OG URLs **absolute** (required for correct OG/canonical). |
| **Canonical** | `alternates.canonical` — the one true URL for a page; prevents duplicate-content dilution. |
| **Open Graph / Twitter** | `<meta property="og:*">` / `<meta name="twitter:*">` — the link preview on social/messaging. |
| **`opengraph-image`** | File convention that auto-adds `og:image`; can be a static file **or** code-generated (`next/og`). |
| **JSON-LD** | Structured data (`<script type="application/ld+json">`) describing entities → rich results. |
| **`sitemap.ts` / `robots.ts`** | Special files → `/sitemap.xml` and `/robots.txt`, generated from code. |
| **Indexability** | SSR/SSG put content in the HTML so crawlers see it without running JS. |

### Abbreviations
| Short | Full form |
|---|---|
| **SERP** | Search Engine Results Page |
| **OG** | Open Graph |
| **JSON-LD** | JSON for Linking Data (schema.org structured data) |
| **hreflang** | The `rel="alternate" hreflang` link for localized pages |
| **CWV** | Core Web Vitals (a ranking factor — Day 9) |

---

## 1. Metadata API — titles, descriptions, canonical

Static per page, or dynamic from data:

```tsx
// static (a page)
export const metadata = { title: "Pricing — Acme", description: "…",
  alternates: { canonical: "/pricing" } };

// dynamic (per slug)
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getPost((await params).slug);
  return { title: `${post.title} — Acme`, description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` } };
}
```

Set **`metadataBase`** once in the root layout so relative URLs resolve to absolute:

```tsx
export const metadata = { metadataBase: new URL(siteConfig.url),
  title: { default: "Acme — …", template: "%s" }, /* + openGraph/twitter defaults */ };
```

The `title.template` lets child pages set a short title that's wrapped site-wide; a
self-referencing **canonical** on every page avoids duplicate-content issues from
query params, trailing slashes, etc.

---

## 2. Open Graph, Twitter cards & a generated OG image

Defaults live in the root layout's `metadata.openGraph` / `metadata.twitter`; pages
override per-route (the blog post sets `openGraph.type: "article"` +
`publishedTime`). The **image** comes from the file convention — no manual
`og:image` tag needed:

```tsx
// app/opengraph-image.tsx — code-generated social card (next/og → a real PNG)
import { ImageResponse } from "next/og";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(<div style={{ /* gradient + title */ }}>…</div>, size);
}
```

Next auto-injects `og:image`/`twitter:image` (with width/height/type) pointing at
this route, so every shared link gets a branded preview card.

---

## 3. Structured data (JSON-LD) for rich results

JSON-LD describes entities to search engines/AI → eligible for rich results
(breadcrumbs, article cards, knowledge panel). Render it as a plain `<script>`
(it's data, not code), sanitizing `<` to `<` to prevent XSS:

```tsx
<script type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />
```

This site ships three types: **Organization** (site-wide, in the layout),
**Article** and **BreadcrumbList** (per blog post). Validate with Google's Rich
Results Test before shipping.

---

## 4. Sitemap & robots (crawl discovery)

```ts
// app/sitemap.ts → /sitemap.xml — static routes + CMS slugs, with freshness hints
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPosts();
  return [{ url: base, priority: 1, changeFrequency: "weekly", lastModified: new Date() },
          ...posts.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: new Date(p.date) }))];
}

// app/robots.ts → /robots.txt — allow crawl, block no-SEO routes, point to sitemap
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
           sitemap: `${base}/sitemap.xml`, host: base };
}
```

The sitemap is generated from the same data as the pages, so new content is
discoverable without hand-editing XML.

---

## 5. Indexability, i18n, and technical SEO

- **Indexability**: SSR/SSG put real content in the HTML, so crawlers index it
  **without executing JS** (the whole point of Days 1–2). Client-only content can
  be missed. Use `robots: { index: false }` for pages that shouldn't be indexed
  (e.g. a 404/not-found, thank-you pages).
- **i18n / hreflang**: `alternates.languages` (per page) and `alternates.languages`
  in the sitemap emit `rel="alternate" hreflang` so Google serves the right locale.
- **Redirects & status codes**: 301 for moved URLs (preserve link equity), real
  **404** (`notFound()`) / 410 for gone content — never a 200 "soft 404".
- **Performance ↔ SEO**: Core Web Vitals (Day 9) are a ranking signal; fast,
  stable pages rank better and convert better.

---

## Build Exercise — ✅ BUILT & RUNNING

Added to the Day 1–9 project (`nr-next-marketing/`):

| Concept | Where |
|---|---|
| Central SEO config | `src/lib/site.ts` |
| `metadataBase` + default OG/Twitter + title template | `src/app/layout.tsx` |
| **Organization JSON-LD** (site-wide) | `src/app/layout.tsx` + `src/components/json-ld.tsx` |
| **Code-generated OG image** (next/og) | `src/app/opengraph-image.tsx` |
| **sitemap.ts** (routes + CMS slugs) | `src/app/sitemap.ts` |
| **robots.ts** | `src/app/robots.ts` |
| Per-post **canonical + OG article** | `src/app/(marketing)/blog/[slug]/page.tsx` |
| **Article + BreadcrumbList JSON-LD** | `src/app/(marketing)/blog/[slug]/page.tsx` |

Run it:
```bash
cd nr-next-marketing
npm run dev
# /sitemap.xml · /robots.txt · /opengraph-image · view-source on / and a blog post
```

---

## Hands-On Walkthrough — Day 10 Proven in This Project

### A. robots.txt & sitemap.xml generate correctly
```
GET /robots.txt
  User-Agent: *  Allow: /  Disallow: /api/
  Host: https://acme.example.com
  Sitemap: https://acme.example.com/sitemap.xml

GET /sitemap.xml  → 10 <loc> URLs (7 static + 3 blog posts), all absolute
  https://acme.example.com, …/pricing, …/blog, …/blog/why-nextjs-for-marketing-sites
```
**What this proves:** crawlers get an allow-list pointing at a complete, code-generated
sitemap covering static pages *and* CMS content.

### B. A real social card is generated
```
GET /opengraph-image  →  type=image/png  1200×630  82 KB  (PNG)
```
And the home `<head>` references it:
```
og:image content="https://acme.example.com/opengraph-image?<hash>"
```
**What this proves:** `next/og` rendered a branded PNG at build, and the file
convention auto-wired `og:image` — every shared link gets a preview card.

### C. Per-page metadata + canonical
```
HOME : <link rel="canonical" href="https://acme.example.com">
       og:title="Acme — Ship marketing pages fast"  twitter:card="summary_large_image"
POST : <link rel="canonical" href="https://acme.example.com/blog/why-nextjs-for-marketing-sites">
       og:type="article"  article:published_time present
```
**What this proves:** absolute canonicals (via `metadataBase`) and route-specific OG —
the blog post correctly declares itself an article.

### D. Valid JSON-LD structured data
Parsing every `ld+json` block in the blog post HTML:
```
ld+json blocks found: 3
  ✓ block 1 valid — @type: Organization
  ✓ block 2 valid — @type: Article
  ✓ block 3 valid — @type: BreadcrumbList
```
**What this proves:** three valid structured-data types ship (site Organization + the
post's Article + Breadcrumbs), making the page eligible for rich results.

### Try-it-yourself experiments
1. **Sitemap grows with content:** add a post to `src/lib/posts.ts`, reload
   `/sitemap.xml` → the new URL appears automatically.
2. **OG preview:** paste a blog URL into a link-preview tester (or
   opengraph.xyz) → the generated card + title/description render.
3. **Rich Results Test:** run a blog URL through Google's Rich Results Test → Article
   + Breadcrumb are detected.
4. **Canonical in action:** open `/blog/x?utm_source=foo` → the canonical still points
   to the clean `/blog/x`, so the tracking param won't fragment indexing.
5. **De-index a page:** add `robots: { index: false }` to a page's metadata → its
   `<meta name="robots" content="noindex">` appears.

---

## Self-Check Questions & Answers

**1. What SEO best practices do you bake into a Next.js marketing site?** *(JD line)*
Render content server-side (SSR/SSG) so crawlers see it in the HTML; per-page titles
and descriptions via the Metadata API with a `metadataBase` and self-referencing
canonicals; Open Graph/Twitter cards with a generated OG image for shareable previews;
JSON-LD structured data (Organization, Article, Breadcrumbs) for rich results; a
code-generated `sitemap.xml` covering static and CMS routes plus a `robots.txt`
pointing to it; correct status codes (301/404/410) and redirects; hreflang for
localized pages; and fast, stable Core Web Vitals since performance is a ranking
factor. Then validate with the Rich Results Test and Search Console.

**2. What is a canonical URL and why does it matter?**
It's the single authoritative URL for a piece of content (`<link rel="canonical">`).
The same content is often reachable via multiple URLs (tracking params, trailing
slashes, pagination), which splits ranking signals and risks duplicate-content
issues. A self-referencing canonical consolidates those signals onto one URL. In
Next, `alternates.canonical` plus `metadataBase` emits an absolute canonical.

**3. How do you generate Open Graph images in Next.js?**
Two ways: drop a static `opengraph-image.(png|jpg)` in a route segment, or
code-generate one with `opengraph-image.tsx` using `ImageResponse` from `next/og`
(JSX → PNG via Satori). Either way Next auto-injects `og:image`/`twitter:image` with
the right dimensions. The code-generated route lets you template per-page cards
(e.g. the post title on a branded background), statically rendered at build.

**4. What is JSON-LD and when do you use it?**
JSON-LD is schema.org structured data embedded as `<script type="application/ld+json">`
that describes entities (Organization, Article, Product, Breadcrumbs, FAQ…) so search
engines and AI understand the page beyond its text — making it eligible for rich
results (stars, breadcrumbs, article cards). Render it as a plain script, sanitize
`<` to prevent XSS, and validate with Google's Rich Results Test.

**5. How do sitemap.ts and robots.ts work in the App Router?**
They're special files at the app root that Next turns into `/sitemap.xml` and
`/robots.txt`. `sitemap.ts` default-exports a function returning an array of `{ url,
lastModified, changeFrequency, priority }` (generate it from your routes + CMS data so
it stays current). `robots.ts` returns rules (allow/disallow per user agent) plus the
sitemap URL. Both are cached/static unless they read request-time data.

**6. Why is server rendering important for SEO?**
Crawlers index the HTML they receive. With SSR/SSG the content (text, headings, links,
metadata) is already in the HTML, so it's reliably indexed and previews/structured
data are present on first fetch. Client-only rendering depends on the crawler
executing JS, which is slower and less reliable — content can be missed or indexed
late. That's why a marketing site should be static/ISR-first.

**7. How does performance relate to SEO?**
Core Web Vitals (LCP/CLS/INP) are a Google ranking signal, and faster pages also
reduce bounce and improve conversions. So the Day 9 work — `next/image`, code-
splitting, non-blocking scripts, CDN/edge — is SEO work too. Fast, stable, crawlable
pages rank and convert better; the metadata/structured data makes sure they're
*presented* well in the SERP.

---

## Interview Soundbites (tie to your NBA.com / JPMC work)
- *"SEO starts with server rendering so crawlers get content in the HTML, then layered
  metadata — per-page titles/descriptions, `metadataBase`-backed canonicals, OG/Twitter
  cards with a generated `next/og` image, and JSON-LD for rich results."*
- *"I generate `sitemap.xml` and `robots.txt` from the same data as the pages, so new
  CMS content is discoverable the moment it's published — no hand-edited XML."*
- *"Canonicals are non-negotiable on a marketing site — campaign UTMs and trailing
  slashes otherwise split your ranking signals across duplicate URLs."*
- *"Performance is SEO: Core Web Vitals are a ranking factor, so the image/JS/caching
  work and the metadata work are two halves of the same goal — rank well and present
  well in the SERP."*
