# Day 1 — Next.js App Router Foundations (Next.js 16)

> Target: Next.js **16.2**, React **19.2**, Node **22 LTS+**, Turbopack (default).
> Scaffold with `npx create-next-app@latest`.

## Recap
| Topic | One-liner |
|---|---|
| **App Router** | File-system routing under `app/` — every folder is a route segment, special files define behavior |
| **Server Component** | The default — renders on the server, ships **zero JS** to the browser, can be `async` and fetch data directly |
| **Client Component** | Opt in with `"use client"` — runs in the browser, can use state/effects/event handlers |
| **`layout.tsx`** | Shared UI that wraps child routes and **persists** across navigation (doesn't re-render) |
| **`page.tsx`** | The unique UI for a route — makes the segment publicly routable |
| **async `params`/`searchParams`** | In Next 15/16 these are **Promises** — you must `await` them |
| **Turbopack** | Default bundler in Next 16 — ~400% faster dev start vs Webpack |

---

## 1. The `app/` Directory & File Conventions

In the App Router, **folders define routes** and **special files define UI/behavior** for that segment.

```
app/
├── layout.tsx          → root layout (required, wraps everything)
├── page.tsx            → "/" route
├── globals.css
├── about/
│   └── page.tsx        → "/about"
├── blog/
│   ├── page.tsx        → "/blog"
│   └── [slug]/
│       └── page.tsx    → "/blog/:slug" (dynamic)
└── pricing/
    └── page.tsx        → "/pricing"
```

**Special files** (each is optional except root layout + a page to be routable):

| File | Purpose |
|---|---|
| `layout.tsx` | Shared wrapper UI; persists across navigation; receives `children` |
| `page.tsx` | The route's unique content; makes the segment publicly accessible |
| `loading.tsx` | Instant loading UI (wraps the segment in a `<Suspense>` boundary) |
| `error.tsx` | Error boundary for the segment (**must** be a Client Component) |
| `not-found.tsx` | UI for `notFound()` calls / unmatched routes |
| `template.tsx` | Like layout but **re-mounts** on navigation (fresh state each time) |
| `route.ts` | API endpoint (covered Day 3) — can't coexist with `page.tsx` in same folder |

---

## 2. Server Components vs Client Components

This is the single most important mental model in modern Next.js.

```tsx
// app/page.tsx — SERVER COMPONENT (the default, no directive needed)
// Can be async, can hit a DB/API directly, ships no JS for itself.
async function getStats() {
  const res = await fetch("https://api.example.com/stats"); // runs on server
  return res.json();
}

export default async function HomePage() {
  const stats = await getStats();
  return <h1>{stats.activeUsers} active users</h1>;
}
```

```tsx
// app/components/Counter.tsx — CLIENT COMPONENT
"use client"; // <-- this directive marks the boundary

import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0); // hooks only work here
  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>;
}
```

**When to use which:**

| Use a **Server Component** when… | Use a **Client Component** when… |
|---|---|
| Fetching data | Using `useState` / `useReducer` |
| Accessing secrets / backend / DB | Using `useEffect` / lifecycle |
| Keeping large deps off the client | Handling events (`onClick`, `onChange`) |
| Rendering static/mostly-static content | Using browser-only APIs (`window`, `localStorage`) |
| **Default — prefer this** | Interactivity is genuinely needed |

**The golden rule:** push `"use client"` **as far down the tree as possible**. A marketing page should be mostly Server Components with small "islands" of interactivity (a nav toggle, a carousel, a form).

### Composition: passing Server content into Client components
You can't import a Server Component into a Client Component, but you **can pass one as `children`/props**:

```tsx
// ✅ Server data rendered inside a client interactive shell
<ClientAccordion>
  <ServerRenderedContent />   {/* stays a server component */}
</ClientAccordion>
```

The Server Component renders on the server; the Client Component just slots its already-rendered output into `children`.

---

## 3. Layouts, Templates & Nesting

A **layout** wraps its segment and all children. The **root layout** is required and must render `<html>` and `<body>`.

```tsx
// app/layout.tsx — root layout
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />   {/* persists across all pages */}
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
```

**Layouts nest.** `app/blog/layout.tsx` wraps everything under `/blog` while still living inside the root layout.

| | `layout.tsx` | `template.tsx` |
|---|---|---|
| Persists across navigation | ✅ (no re-render) | ❌ (re-mounts) |
| Resets state on nav | ❌ | ✅ |
| Use for | Header/footer/nav | Enter animations, per-route fresh state |

---

## 4. Routing: Dynamic, Groups, Parallel & Intercepting

### Dynamic routes
```
app/blog/[slug]/page.tsx        → /blog/hello   (params.slug = "hello")
app/shop/[...all]/page.tsx      → catch-all: /shop/a/b/c
app/shop/[[...all]]/page.tsx    → optional catch-all (also matches /shop)
```

### ⚠️ `params` and `searchParams` are async (Next 15/16)
This is the biggest gotcha vs older tutorials — they are now **Promises**:

```tsx
// app/blog/[slug]/page.tsx
export default async function BlogPost({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;            // must await
  const { ref } = await searchParams;       // must await
  return <article>Post: {slug} (ref: {ref})</article>;
}
```

### Next 16 typed route props (`PageProps` / `LayoutProps`)
Next 16 auto-generates global type helpers (during `next dev`/`build`/`typegen`) so you don't hand-write the Promise types:

```tsx
// params/searchParams typed from the route string — no manual typing
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params;
  return <h1>{slug}</h1>;
}
```
`LayoutProps<'/dashboard'>` similarly types `children` + any named slots. (The build project uses explicit `Promise<{slug}>` typing for clarity, but `PageProps` is the modern shortcut.)

### Route groups — organize without affecting the URL
```
app/(marketing)/about/page.tsx   → /about   (the (marketing) folder is invisible in URL)
app/(marketing)/pricing/page.tsx → /pricing
app/(shop)/cart/page.tsx         → /cart
```
Great for giving marketing pages their own shared layout separate from app pages.

### Parallel & intercepting routes (advanced — know they exist)
- **Parallel routes** (`@slot`): render multiple pages in the same layout simultaneously (dashboards, modals).
- **Intercepting routes** (`(.)`, `(..)`): show a route's content in the current context (e.g., a photo modal over a feed) while keeping a shareable URL.

---

## 5. `generateStaticParams` — Pre-render Dynamic Pages at Build

For CMS-driven marketing pages, you pre-render all known slugs at build time (SSG):

```tsx
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await fetch("https://cms.example.com/posts").then((r) => r.json());
  return posts.map((p: { slug: string }) => ({ slug: p.slug }));
}
```

Next builds a static HTML page for every returned slug. Combine with ISR (Day 2) so new CMS posts appear without a full redeploy.

---

## 6. Navigation & `<Link>`

```tsx
import Link from "next/link";

<Link href="/pricing" prefetch>Pricing</Link>
```

- `<Link>` does **client-side navigation** (no full page reload) and **prefetches** routes in the viewport for instant transitions — critical for marketing-site feel and Core Web Vitals.
- Programmatic navigation (Client Components only):

```tsx
"use client";
import { useRouter } from "next/navigation"; // NOT "next/router" (that's Pages Router)

const router = useRouter();
router.push("/thank-you");
```

---

## 7. Metadata (intro — full SEO on Day 10)

```tsx
// Static metadata
export const metadata = {
  title: "Pricing — Acme",
  description: "Simple, transparent pricing.",
};

// Dynamic metadata (per-slug)
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  return { title: post.title, description: post.excerpt };
}
```

---

## 8. Turbopack (Next 16 default)

- Default dev **and** build bundler in Next 16 — no config needed.
- ~400% faster dev server startup and ~50% faster rendering vs the old Webpack path.
- Server Fast Refresh: fine-grained server-side hot reloading.
- You generally don't think about it — just know "Next 16 uses Turbopack by default" for interviews.

---

## App Router vs Pages Router (interview classic)

| | **App Router** (`app/`) | **Pages Router** (`pages/`) |
|---|---|---|
| Components | Server Components by default | Client components only |
| Data fetching | `async` components, `fetch` | `getServerSideProps`/`getStaticProps` |
| Layouts | Nested `layout.tsx`, persistent | `_app.tsx` only, manual |
| Streaming/Suspense | Built-in (`loading.tsx`, PPR) | Limited |
| Router import | `next/navigation` | `next/router` |
| Status | Recommended / default | Legacy (still supported) |

---

## Build Exercise — ✅ BUILT & RUNNING

Project lives at **`nr-next-marketing/`** (Next 16.2.7, React 19.2.4, Tailwind v4).

Run it:
```bash
cd nr-next-marketing
npm run dev          # → http://localhost:3000  (Turbopack)
```

What it demonstrates (each maps to a section above):
| Concept | Where in the project |
|---|---|
| Root layout (html/body/fonts) | `src/app/layout.tsx` |
| **Route group** `(marketing)` | `src/app/(marketing)/` — URL has no `/marketing` |
| Route-group layout (header/footer) | `src/app/(marketing)/layout.tsx` |
| **Server Component + server fetch** | `src/app/(marketing)/page.tsx` (Home — fetches team count on server) |
| **Client island** (`"use client"`, `useState`) | `src/components/site-header.tsx` (mobile-nav toggle) |
| Server Component (zero JS) | `src/components/site-footer.tsx` |
| Static pages (SSG) | `pricing/`, `about/` |
| **Dynamic route + async `params`** | `blog/[slug]/page.tsx` |
| **`generateStaticParams`** | `blog/[slug]/page.tsx` (pre-renders all slugs) |
| **`generateMetadata`** (per-page SEO) | `blog/[slug]/page.tsx` |
| **`notFound()`** | unknown slug → 404 |
| `<Link prefetch>` client navigation | header + cards |
| Local "CMS" data source | `src/lib/posts.ts` |

Verified working: all routes return 200 with correct per-page `<title>`, the home page's
server fetch ("Trusted by 10+ teams") is in the SSR HTML, and `/blog/does-not-exist` returns **404**.

---

## Hands-On Walkthrough — Day 1 Concepts Proven in This Project

Each concept below is shown with the **actual project code** + the **real output observed**
when running/building the app. Reproduce these yourself.

### A. File-system routing → real URLs
The folder layout under `src/app/` maps 1:1 to URLs. Production build confirms the routes:

```
Route (app)                               Revalidate  Expire
┌ ○ /                                             1h      1y
├ ○ /about
├ ○ /blog
├ ● /blog/[slug]
│ ├ /blog/why-nextjs-for-marketing-sites
│ ├ /blog/server-vs-client-components
│ └ /blog/core-web-vitals-basics
└ ○ /pricing

○  (Static)  prerendered as static content
●  (SSG)     prerendered as static HTML (uses generateStaticParams)
```
> Note: this table is the **default-model** snapshot (before Day 2 enabled Cache
> Components). On Day 2 the project sets `cacheComponents: true`, after which `/blog/[slug]`
> becomes `◐` Partial Prerender. The concepts here are unchanged.

**What this proves:**
- `(marketing)` is **absent from every URL** — route groups organize without affecting paths.
- `○` pages are fully static. `● /blog/[slug]` is **SSG** — and the 3 child URLs are exactly the slugs
  returned by `generateStaticParams` in `blog/[slug]/page.tsx`. Next pre-rendered one HTML file per slug.
- `/` shows **Revalidate 1h** because the Home server `fetch` used `next: { revalidate: 3600 }` —
  that's ISR (preview of Day 2): static, but refreshes hourly.

### B. Server Component → data is baked into the HTML (zero client fetch)
`src/app/(marketing)/page.tsx` is `async` and fetches on the server:

```tsx
async function getTeamCount() {
  const res = await fetch("https://jsonplaceholder.typicode.com/users",
    { next: { revalidate: 3600 } });
  return (await res.json()).length;
}
export default async function HomePage() {
  const [teamCount, posts] = await Promise.all([getTeamCount(), getPosts()]);
  ...
}
```
Fetching the raw HTML of `/` (no JS executed) shows the data is **already there**:
```
team count text present: true     →  "Trusted by 10+ teams"
post title present:       true     →  "Server vs Client Components"
footer year in HTML:      2026     →  © <!-- -->2026<!-- --> Acme Inc.
```
**What this proves:** the fetch and `new Date().getFullYear()` ran on the **server**; the browser
receives finished HTML. No client-side fetch, no loading spinner, great for SEO. (The `<!-- -->`
are just React's text-node markers.)

### C. Client island → the one interactive piece
`src/components/site-header.tsx` starts with `"use client"` because it needs `useState` for the
mobile menu. The button is in the server HTML, ready to hydrate:
```
has aria-expanded button: true
has "Menu" label:         true
```
**What this proves the pattern:** a Server Component layout (`(marketing)/layout.tsx`) renders a tiny
Client island (the header) — "**server shell + client island**." The footer (`site-footer.tsx`,
no `"use client"`) ships **zero JS**. Try it in the browser: shrink the window → click **Menu** →
the toggle works (that's the hydrated `useState`).

#### How hydration actually works
"Hydration" = React taking the **already-rendered HTML** the server sent and **attaching the
JavaScript** (event listeners, state) to it — without re-creating the DOM. The page is *visible*
immediately; it becomes *interactive* a moment later once the JS loads and hydrates.

The lifecycle for this header:

1. **Server render** — Next runs `SiteHeader` on the server and produces static HTML for the
   `<button>` (including `aria-expanded="false"` and the text "Menu"). At this instant the button is
   painted on screen but **dead** — clicking does nothing, because no JS is attached yet.
2. **HTML + RSC payload sent** — the browser shows the markup right away (fast First Paint).
   Alongside it, Next sends the JS chunk for this `"use client"` component.
3. **Hydration** — React walks the existing server DOM, matches it to the component tree, and
   **wires up** the `onClick` handler and initializes `useState(false)`. No DOM is thrown away;
   React just "adopts" what's there.
4. **Interactive** — now clicking **Menu** calls `setOpen`, React re-renders *on the client*, and the
   mobile nav appears. From here on it behaves like a normal client React app.

```
SERVER                          NETWORK                 BROWSER
run SiteHeader → HTML  ───────► HTML (visible fast) ──► paint button (not yet clickable)
                                + JS chunk (island) ──► React hydrates → attaches onClick + state
                                                        button now interactive
```

**Why only this component hydrates:** the `"use client"` directive marks a **boundary**. Everything
*above* it (the marketing layout, the page) stays server-only and ships no JS. Only the header
subtree — and anything you nest as its client children — gets a JS bundle and hydrates. The footer,
having no directive, is never hydrated at all. That's why a marketing page can feel instant: you're
hydrating a few small islands, not the whole page.

**Key terms:**
| Term | Meaning |
|---|---|
| **Hydration** | Attaching JS behavior to server-rendered HTML (reusing the DOM) |
| **Hydration boundary** | The `"use client"` component (and its subtree) — the unit that gets JS |
| **TTI vs FCP** | HTML paints fast (good FCP); interactivity waits for hydration (TTI) |
| **Hydration mismatch** | When server HTML ≠ first client render (e.g. `Date.now()`/`Math.random()` in render, or browser-only values) → React warns and may discard the server HTML. Avoid non-deterministic output during render. |

**Gotcha to remember for interviews:** anything that differs between server and client render causes a
**hydration mismatch**. Classic culprits: rendering `new Date()`/`Math.random()` directly, reading
`window`/`localStorage` during render, or locale-dependent formatting. Fix by computing such values in
`useEffect` (after hydration) or passing a stable value from the server.

### D. Composition: server layout rendering a client child
`(marketing)/layout.tsx` is a **Server Component** that imports and renders `<SiteHeader/>` (client).
This is legal because the server renders the shell and hands the client island its slot — you don't
"import a server component into a client component," you nest them.

### E. Dynamic route + async `params` + notFound()
`blog/[slug]/page.tsx`:
```tsx
const { slug } = await params;          // ⚠️ Promise in Next 15/16 — must await
const post = await getPost(slug);
if (!post) notFound();                  // → renders the 404
```
Observed:
```
200  /blog/why-nextjs-for-marketing-sites   (title: "Why Next.js... — Acme")
404  /blog/does-not-exist
```
**What this proves:** the slug is read from the awaited Promise; a missing slug triggers `notFound()`
and a real 404 status (not a 200 with an error message).

### F. Per-page metadata (SEO)
Each page exports `metadata` (static) or `generateMetadata` (dynamic). Observed `<title>` per route:
```
/         → "Acme — Ship marketing pages fast"
/pricing  → "Pricing — Acme"
/blog/...  → "Why Next.js is great for marketing sites — Acme"   (from generateMetadata)
```
**What this proves:** titles/descriptions are per-route and data-driven — the foundation for Day 10 SEO.

### Try-it-yourself experiments
1. **Prove the async-params gotcha:** in `blog/[slug]/page.tsx` change `const { slug } = await params;`
   to `const { slug } = params;` → TypeScript errors and the page breaks. Revert.
2. **Move the boundary:** add `"use client"` to the top of `site-footer.tsx` and rebuild — it now ships
   JS for no reason. Remove it. (Lesson: keep `"use client"` as low as possible.)
3. **Add a post:** add an entry to `src/lib/posts.ts`, rebuild, and watch a new `●` SSG URL appear in
   the route table.
4. **Add a route:** create `app/(marketing)/contact/page.tsx` — it's instantly live at `/contact`.

---

## Self-Check Questions & Answers

**1. Why are Server Components the default, and what's the cost of marking something `"use client"`?**
Server Components run on the server and ship **zero JS** for themselves, so you get faster First Paint,
better SEO (content is in the HTML), direct/secure data access (DB, secrets), and smaller client
bundles. The cost of `"use client"`: that component **and its subtree become a hydration boundary** —
its JS is downloaded, parsed, and hydrated in the browser. It can no longer be `async`/fetch directly
or touch server-only resources, and it adds to Time-to-Interactive. Rule: default to Server, opt into
Client only for state/effects/event handlers/browser APIs, and push the boundary as low as possible.
*(In this project: footer = server, zero JS; header = client island only because of the menu toggle.)*

**2. How do you render server-fetched data inside a client interactive component?**
You **don't import a Server Component into a Client Component**. Instead you (a) fetch on the server and
**pass the data down as props**, or (b) **nest the server-rendered UI as `children`/a prop** of the
client component:
```tsx
// Server layout/page
<ClientShell>
  <ServerRenderedContent />   {/* stays server-rendered; client just slots it in */}
</ClientShell>
```
The server renders the content; the client component receives finished output and only owns the
interactive wrapper. *(Project example: the server `(marketing)/layout.tsx` renders the client
`<SiteHeader/>`.)*

**3. What changed about `params`/`searchParams` in Next 15/16, and how do you handle it?**
They are now **Promises** (previously plain objects). You must `await` them in an `async` component:
```tsx
const { slug } = await params;
const { ref } = await searchParams;
```
For typing, hand-write `params: Promise<{ slug: string }>` or use the auto-generated
`PageProps<'/blog/[slug]'>` helper. Reading `searchParams` opts the route into dynamic rendering.
In Client Components, use the `useSearchParams()` hook instead. *(Project: `blog/[slug]/page.tsx`
awaits `params`.)*

**4. Difference between `layout.tsx` and `template.tsx`?**
Both wrap child routes, but a **layout persists** across navigation — it does **not** re-render and
its state is preserved (ideal for header/footer/nav). A **template re-mounts** on every navigation —
fresh state and effects each time (ideal for enter animations or per-route reset logic). If both
exist, the template renders inside the layout.

**5. When would you use a route group `(marketing)`?**
To **organize routes and share a layout without affecting the URL**. Wrapping a folder in parentheses
makes it invisible in the path, so you can give marketing pages one layout (header/footer) and, say,
app/dashboard pages a different layout — while keeping clean URLs like `/pricing` (not
`/marketing/pricing`). Also handy to split one big app into sections with different root-level UI.
*(Project: everything lives under `(marketing)/` yet URLs have no `/marketing`.)*

**6. Which router hook do you import in the App Router, and what's the common wrong import?**
Use **`import { useRouter } from "next/navigation"`** (App Router). The common mistake is importing
from **`next/router`**, which is the **Pages Router** API — it won't work in `app/` and throws at
runtime. From `next/navigation` you also get `usePathname`, `useSearchParams`, and `useParams`.
Remember: `useRouter` (and friends) are client-only, so the component needs `"use client"`.

---

## Interview Soundbites (tie to your NBA.com work)
- *"On NBA.com I architected a Next.js front end where the page shell and content were server-rendered for speed and SEO, with small client islands only where interactivity was needed — that's exactly the App Router's Server/Client Component model."*
- *"For CMS-driven pages I'd use `generateStaticParams` to pre-render all known slugs, then ISR to publish new content without a redeploy."*
