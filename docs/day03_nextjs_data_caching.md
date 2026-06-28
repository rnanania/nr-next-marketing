# Day 3 — Data Fetching, Caching & Third-Party APIs

> Target: Next.js **16.2**, React **19.2**. Builds on the Day 1/2 project
> (`nr-next-marketing/`). Day 2 was *where* a page renders (static/ISR/PPR);
> Day 3 is *how it gets its data* — fetching, the opt-in caching model, route
> handlers, server actions, and talking to third-party APIs safely.

## Recap
| Topic | One-liner |
|---|---|
| **Caching is opt-in (since 15)** | `fetch` is **uncached by default** — you choose what to cache with `use cache`. Old tutorials assumed cached-by-default. |
| **`use cache`** | Caches a function/component's output. Pair with `cacheLife` (how long) + `cacheTag` (invalidate by name). |
| **Route Handler** (`route.ts`) | Custom HTTP endpoint (GET/POST/…) using Web `Request`/`Response`. The App Router's API route. |
| **Server Action** (`"use server"`) | Async server function callable from the client over POST — how you do mutations/forms without a hand-built API. |
| **`revalidateTag(tag, "max")`** | Invalidate cached data by tag (stale-while-revalidate). The CMS-webhook primitive. Two-arg form in 16; single-arg is deprecated. |
| **`updateTag` / `revalidatePath`** | `updateTag` = immediate expiry (Actions only, read-your-own-writes); `revalidatePath` = invalidate a whole route. |
| **`server-only`** | A package whose import **fails the build** if pulled into a client bundle — guards secrets/server code. |
| **Request memoization** | Identical `fetch`es (and `React.cache`-wrapped fns) dedupe within a single request render. |

### Abbreviations
| Short | Full form |
|---|---|
| **BFF** | Backend-For-Frontend (a server endpoint your own UI calls) |
| **SWR** | Stale-While-Revalidate (serve stale now, refresh in background) |
| **ISR** | Incremental Static Regeneration |
| **PPR** | Partial Prerendering |
| **RSC** | React Server Components |
| **CMS** | Content Management System |
| **SSR** | Server-Side Rendering |

---

## 1. The caching shift you must be able to explain

The single most important interview point for this topic:

> **Before Next 15:** `fetch` was **cached by default** (force-cache). You opted *out*.
> **Next 15/16:** `fetch` is **uncached by default**. You opt *in* — explicitly, with `use cache`.

Why it changed: cached-by-default surprised people with stale data and made caching
"invisible." The new model makes caching **explicit and intentional** — you can see
exactly what's cached by reading the code.

```tsx
// Uncached (default): runs on every request, blocks render until done.
const res = await fetch("https://api.example.com/data");

// Cached: extract into a `use cache` helper.
async function getData() {
  "use cache";
  cacheLife("hours");
  cacheTag("data");           // so you can revalidate it on demand later
  return (await fetch("https://api.example.com/data")).json();
}
```

You can also tag a raw `fetch` directly: `fetch(url, { next: { tags: ["data"] } })`.

---

## 2. Fetching data in Server Components

Server Components can be `async` and fetch directly — no `getServerSideProps`,
no client round-trip. Credentials/query logic stay on the server.

**Parallel vs sequential** (a classic perf question):

```tsx
// ❌ Sequential — albums waits for artist (waterfall)
const artist = await getArtist(id);
const albums = await getAlbums(id);

// ✅ Parallel — start both, then await together
const [artist, albums] = await Promise.all([getArtist(id), getAlbums(id)]);
```

**Request memoization:** identical `fetch` calls in one request render are deduped
automatically, so you can fetch in the component that needs the data instead of
prop-drilling. For non-`fetch` work (DB/ORM), wrap in React's `cache()` to get the
same per-request dedupe.

**Client-side fetching** (when you genuinely need it): React's `use()` to read a
promise passed from the server, or SWR/React Query. Prefer server fetching for
marketing pages — it's faster and SEO-friendly.

---

## 3. Route Handlers (`route.ts`) — the App Router's API routes

A `route.ts` exports functions named after HTTP methods. It uses the Web
`Request`/`Response` APIs.

```ts
// app/api/todos/route.ts
export async function GET() {
  const data = await getRemoteTodos();      // server-side only
  return Response.json(data);
}
```

Rules to remember:
- Methods: `GET POST PUT PATCH DELETE HEAD OPTIONS`; unsupported → **405**.
- **Cannot** sit in the same folder as a `page.tsx` (route vs page conflict).
- They **don't** participate in layouts or client navigation — lowest-level primitive.
- Type the params with the global helper: `RouteContext<'/users/[id]'>`.

**Caching with Cache Components:** a `GET` handler follows the **same model as a page** —
request-time by default, but **prerendered if it only returns cached/deterministic
data**. ⚠️ `use cache` **cannot** go in the handler body — extract it to a helper
(that's exactly why our `getRemoteTodos` exists). `POST`/mutations are never cached.

**Why use one (the BFF pattern):** hide a third-party URL + API key, reshape a
payload, add caching/rate-limiting in front of an upstream, or give client code a
same-origin endpoint. (§5.)

---

## 4. Server Actions (`"use server"`) — mutations & forms

A **Server Action** is an async function that runs on the server but is callable
from the client (over a POST). Mark it with `"use server"` (top of function, or top
of a file to mark all exports).

```tsx
// lib/actions.ts
"use server";
export async function subscribe(prev, formData: FormData) {
  const email = String(formData.get("email"));
  if (!isValid(email)) return { ok: false, message: "Invalid email" };
  await save(email);
  return { ok: true, message: "Subscribed" };
}
```

Invoke it from a form (progressive enhancement — works before JS hydrates):

```tsx
"use client";
const [state, formAction] = useActionState(subscribe, initial);
return <form action={formAction}>…</form>;
// useFormStatus() in a child gives the `pending` flag for the submit button.
```

…or from a button/event handler via `useTransition` (our `RefreshButton`).

> **Security:** actions are reachable by direct POST, not just your UI — **always
> validate and authorize inside the action.** Don't trust the client.

After a mutation you typically: `revalidateTag`/`revalidatePath` (refresh cached
data), `updateTag` (immediate, read-your-own-writes), `redirect`, or `refresh()`
(re-pull the current route's data).

---

## 5. Third-party APIs the right way (secrets + resilience)

```ts
// lib/server/env.ts
import "server-only";          // build FAILS if a client bundle imports this
export const apiConfig = { baseUrl: …, apiKey: process.env.PLACEHOLDER_API_KEY, … };
```

`server-only` is a guard: pull it (transitively) into a `"use client"` module and
the build breaks — so keys can't leak to the browser. Wrap calls in a typed fetch
helper with a **timeout, error handling, and a retry**:

```ts
async function apiFetch<T>(path: string): Promise<T> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(`${apiConfig.baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${apiConfig.apiKey}` }, // added server-side
        signal: AbortSignal.timeout(5000),                        // don't hang render
      });
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as T;
    } catch (e) { if (attempt === 2) throw e; }                   // retry once
  }
  throw new Error("unreachable");
}
```

Then cache + tag the accessor (`getRemoteTodos`) and expose it both to pages
(direct call) and to the browser (the `/api/todos` BFF proxy).

---

## 6. The three revalidation APIs — which one, when

| API | Where | Behavior | Use case |
|---|---|---|---|
| `revalidateTag(tag, "max")` | Server Action **or** Route Handler | SWR (serve stale, refresh in bg) | CMS publish webhook / background refresh |
| `updateTag(tag)` | Server Action **only** | **Immediate** expiry | Read-your-own-writes (user must see change now) |
| `revalidatePath(path)` | Action or Route Handler | Invalidate a whole route | When you don't know the tags |

- Prefer **tags over paths** — more precise, no over-invalidation.
- `revalidateTag(tag)` (single-arg) is **deprecated** in 16 — pass `"max"`.
- `"max"` marks stale; the fresh fetch happens on the **next visit** to a tagged
  page (not eagerly). Webhooks needing instant expiry: `revalidateTag(tag, { expire: 0 })`.

---

## Build Exercise — ✅ BUILT & RUNNING

All added to the Day 1/2 project (`nr-next-marketing/`):

| Concept | Where |
|---|---|
| `server-only` secret/config guard | `src/lib/server/env.ts` |
| Typed `fetch` wrapper (timeout + retry) + cached/tagged accessor | `src/lib/remote.ts` (`getRemoteTodos`) |
| **Route Handler — BFF proxy** (hides upstream URL/key) | `src/app/api/todos/route.ts` |
| **Route Handler — webhook revalidation** (secret + `revalidateTag`) | `src/app/api/revalidate/route.ts` |
| **Server Actions** (form mutation + tag revalidation) | `src/lib/actions.ts` (`subscribe`, `refreshTodos`) |
| `useActionState` + `useFormStatus` form island | `src/components/subscribe-form.tsx` |
| Server Action via `useTransition` + `router.refresh()` | `src/components/refresh-button.tsx` |
| Cached third-party data page + on-demand revalidate | `src/app/(marketing)/integrations/page.tsx` |
| Server-Action form page | `src/app/(marketing)/subscribe/page.tsx` |

Run it:
```bash
cd nr-next-marketing
npm run dev          # http://localhost:3000 → /integrations and /subscribe
npm run build        # see the render-type table (○ cached handler, ƒ dynamic)
```

---

## Hands-On Walkthrough — Day 3 Concepts Proven in This Project

### A. The build table classifies the new endpoints
```
├ ƒ /api/revalidate                               ← Dynamic (POST + request data)
├ ○ /api/todos                            1h   1d  ← cached GET handler (use cache helper)
├ ○ /integrations                         1h   1d  ← cached page (tag: todos)
└ ○ /subscribe                            1d   1w  ← static shell + form island
```
**What this proves:** with Cache Components, a `GET` handler that returns only cached
data is **prerendered like a page** (`○`, revalidate 1h) — while the `POST`
revalidation handler is **dynamic** (`ƒ`). The model is uniform across pages and handlers.

### B. Route Handler as a BFF proxy — upstream hidden
`GET /api/todos` returns the upstream data, but the client never sees the URL or key:
```json
{"source":"proxied via /api/todos (upstream URL + key hidden)","count":5,
 "todos":[{"userId":1,"id":1,"title":"delectus aut autem","completed":false}, …]}
```
**What this proves:** the browser hits a same-origin endpoint; the third-party base
URL + `Authorization` header live in `lib/remote.ts`/`env.ts` (server-only). That's
the secret-hiding BFF pattern.

### C. Webhook revalidation — secret-gated
```
POST /api/revalidate?secret=WRONG&tag=todos      → 401 {"revalidated":false,"error":"invalid secret"}
POST /api/revalidate?secret=dev-secret&tag=todos → 200 {"revalidated":true,"tag":"todos","now":…}
```
**What this proves:** the handler authorizes before mutating cache state — a bad
secret can't trigger revalidation. This is the Contentful publish-webhook shape (Day 11).

### D. `use cache` freezes data until revalidated (SWR proven end-to-end)
Two quick reloads of `/integrations` return the **same** stamp; after a tag
revalidation the value updates on the **next-but-one** visit (stale-while-revalidate):
```
req1: 2026-06-09T15:26:30.187Z
req2: 2026-06-09T15:26:30.187Z          ← stable (cached)

before        : 2026-06-09T15:27:24.059Z
→ POST /api/revalidate?tag=todos
after (visit1): 2026-06-09T15:27:24.059Z  ← still stale; triggers background refresh
after (visit2): 2026-06-09T15:27:59.520Z  ← fresh value now served
```
**What this proves:** `use cache` + `cacheTag("todos")` cached the snapshot; the
revalidate marked it stale; the first visit after still got the fast stale copy while
Next refreshed in the background; the next visit got fresh data. **No redeploy.**

### E. Server Action form renders + is wired
```
/subscribe HTML contains: name="email", type="submit", "Server Action"
```
**What this proves:** the form is a real `<form action={serverAction}>` — it posts to
the `subscribe` action (server-validated), with `useActionState`/`useFormStatus`
driving the inline result and pending state.

### Try-it-yourself experiments
1. **Watch the BFF in the browser:** open DevTools → Network → load `/integrations`,
   then hit `/api/todos` — the request is same-origin; the upstream URL/key never appear.
2. **Trigger the `server-only` guard:** add `import "@/lib/server/env"` to the top of
   `subscribe-form.tsx` (a `"use client"` file) and `npm run build` → it **fails**
   ("server-only cannot be imported from a Client Component"). Remove it.
3. **Webhook → fresh content:** load `/integrations`, note the stamp, run
   `curl -X POST "http://localhost:3000/api/revalidate?secret=dev-secret&tag=todos"`,
   reload twice → stamp updates on the second reload (SWR).
4. **Break caching on purpose:** change `getRemoteTodos`' `cacheLife("hours")` to
   `cacheLife("seconds")` and rebuild → it's short-lived, so it drops out of the static
   shell and `/api/todos` flips from `○` to `ƒ` (dynamic). Revert.
5. **Submit the form with JS off:** disable JavaScript, submit `/subscribe` → the
   Server Action still runs (progressive enhancement).

---

## Self-Check Questions & Answers

**1. What changed about caching defaults in Next 15/16, and how do you cache now?**
`fetch` used to be **cached by default**; since 15 it's **uncached by default** — every
fetch runs per request unless you opt in. You cache explicitly by extracting the call
into a `use cache` helper with `cacheLife` (duration) and `cacheTag` (for on-demand
invalidation), or by tagging a raw fetch: `fetch(url, { next: { tags: ["x"] } })`. The
shift makes caching visible and intentional instead of an invisible default.

**2. Walk me through Next.js caching layers and how you'd debug stale data.**
Layers: (a) **Request memoization** — identical fetches dedupe within one render;
(b) the **`use cache` data/full-route cache** — `cacheLife`/`cacheTag` controlled;
(c) the **client Router Cache** — prefetched/visited RSC payloads; (d) the **CDN** in
front. To debug stale data: check whether the data is wrapped in `use cache` and its
`cacheLife` window; confirm the relevant `cacheTag` is actually being revalidated on
change (webhook/action firing `revalidateTag`); `router.refresh()` to rule out the
client Router Cache; and check CDN/edge caching headers last.

**3. When do you use a Route Handler vs a Server Action?**
**Route Handler** (`route.ts`) = a real HTTP endpoint — use it for webhooks, public/
third-party-consumable APIs, BFF proxies that hide keys, OAuth callbacks, file/stream
responses. **Server Action** = an internal mutation called from your own UI (forms,
button clicks) without hand-writing an endpoint or doing client `fetch` plumbing. Rule
of thumb: external/contract surface → Route Handler; internal form/mutation → Server Action.

**4. How do you integrate a third-party API without leaking secrets?**
Keep the call server-side: read the key from an env var in a module guarded by
`import "server-only"` (so it can never enter a client bundle), add the auth header
inside a server `fetch` wrapper (with timeout + retry + error handling), and expose
results to the browser only through a Route Handler (BFF) or by passing server-fetched
data down as props. The browser sees a same-origin endpoint, never the upstream URL or key.

**5. Explain on-demand revalidation and which API you'd pick.**
It's invalidating cached data the moment it changes, rather than waiting for the time
window. `revalidateTag(tag, "max")` (Actions **or** Route Handlers) marks tagged data
stale with stale-while-revalidate — ideal for a CMS publish webhook. `updateTag(tag)`
(Actions only) expires immediately for read-your-own-writes (the editor must see their
change now). `revalidatePath(path)` nukes a whole route when you don't know the tags.
Prefer tags over paths; in 16 always pass the second arg (`"max"`) — single-arg is deprecated.

**6. What's request memoization and how is it different from `use cache`?**
**Request memoization** dedupes identical `fetch`es (and `React.cache`-wrapped
functions) **within a single request's render** — scoped to that request, gone after.
It saves you from prop-drilling fetched data. **`use cache`** is a **persistent**
cache across requests/users, governed by `cacheLife`/`cacheTag`. Memoization = "don't
fetch the same thing twice while rendering this one page"; `use cache` = "reuse this
result for everyone until it's revalidated."

**7. How do you show pending/error state for a form mutation?**
Wire the `<form action={…}>` to a Server Action via `useActionState(action, initial)`,
which returns `[state, formAction, pending]` — render `state` (success/error the action
returned) and use `pending` (or `useFormStatus()` in a child) to disable the button and
show a "Submitting…" label. Validate inside the action and return a typed result object.

---

## Interview Soundbites (tie to your NBA.com / JPMC work)
- *"Since Next 15 caching is opt-in — `fetch` is uncached by default. I cache stable
  data with `use cache` + `cacheLife`, tag it with `cacheTag`, and revalidate on the
  CMS publish webhook via `revalidateTag` — static performance, fresh content, no redeploy."*
- *"For third-party APIs I put a Route Handler in front as a BFF: the key lives in a
  `server-only` module and the auth header is added server-side, so the browser only
  ever talks to a same-origin endpoint — no secrets in the bundle."*
- *"Mutations are Server Actions, not bespoke endpoints — `useActionState` for pending/
  error state, server-side validation inside the action, then `revalidateTag` (or
  `updateTag` for read-your-own-writes) so the UI reflects the change immediately."*
- *"To debug stale data I walk the layers — request memoization, the `use cache` window
  and its tag, the client Router Cache, then the CDN — instead of guessing."*
