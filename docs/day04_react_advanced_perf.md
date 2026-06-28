# Day 4 — React Advanced & Performance (React 19.2)

> Target: React **19.2**, Next.js **16.2**. Builds on the Day 1–3 project
> (`nr-next-marketing/`). Day 3 was server-side data; Day 4 is the **client**:
> how React re-renders, how React 19 removes boilerplate (Compiler, `ref` as a
> prop), and the new **Actions** hooks for interactive forms.

## Recap
| Topic | One-liner |
|---|---|
| **React Compiler** | Build-time auto-memoization. Removes most manual `useMemo`/`useCallback`/`memo`. Stable in Next 16, opt-in via `reactCompiler: true`. |
| **Re-render model** | A component re-renders when its **state/props change** (or its parent re-renders). Rendering is computing the next tree; React then **reconciles** (diffs) and commits the minimal DOM changes. |
| **keys** | Stable identity for list items so reconciliation matches old↔new. Use a real id, **never the array index** for dynamic lists. |
| **`useDeferredValue`** | Render a **lagging copy** of a fast-changing value so typing stays responsive; the heavy work trails behind. |
| **`useTransition`** | Mark a state update **non-urgent** (`startTransition`) so it doesn't block input; gives an `isPending` flag. |
| **Actions** | Async functions wired to `<form action>`/transitions. Hooks: `useActionState`, `useFormStatus`, `useOptimistic`. |
| **`use()`** | Read a promise or context **conditionally** (unlike other hooks); suspends until the promise resolves. |
| **`ref` as a prop** | React 19: function components take `ref` directly — **`forwardRef` is gone**. |
| **Native metadata** | `<title>`/`<meta>`/`<link>` rendered anywhere are **hoisted to `<head>`** by React. |
| **Error boundary** | `error.tsx` (must be a Client Component) catches render errors in a segment and shows fallback UI. |

### Abbreviations
| Short | Full form |
|---|---|
| **RSC** | React Server Components |
| **VDOM** | Virtual DOM (React's in-memory element tree) |
| **TTI** | Time To Interactive |
| **INP** | Interaction to Next Paint (responsiveness Web Vital) |
| **HOC** | Higher-Order Component |

---

## 1. The React Compiler — auto-memoization

The headline React 19 change. The compiler analyzes your components at **build
time** and inserts memoization automatically, so a component only recomputes
derived values and re-renders children when the relevant inputs actually change.

```tsx
// Before: hand-written memoization to avoid recomputing on every render
const visible = useMemo(() => items.filter(f), [items, query]);
const onClick = useCallback(() => …, [dep]);

// With the React Compiler: just write it plainly. The compiler memoizes for you.
const visible = items.filter(f);
const onClick = () => …;
```

**What changes about how you optimize:** you stop reaching for `useMemo`/
`useCallback`/`React.memo` by default. You still understand *why* they existed
(referential stability, skipping re-renders) — but the compiler handles the
common cases. You write code for clarity; the build makes it fast.

**Enable it (Next 16):**
```ts
// next.config.ts
const nextConfig = { reactCompiler: true };   // + npm i -D babel-plugin-react-compiler
```
It runs through a Babel plugin (Next applies it only to relevant files via SWC),
so **builds are a bit slower** in exchange for the optimization. The compiler is
conservative: code that breaks the [Rules of React](https://react.dev/reference/rules)
is **skipped** (left as-is), not broken. `eslint-plugin-react-hooks@7` ships the
lint rules that flag code the compiler can't optimize. You can run in opt-in mode
(`compilationMode: 'annotation'` + `"use memo"`) or opt a file out with `"use no memo"`.

> ⚠️ Older tutorials are full of `useMemo`/`useCallback`. With the compiler, that's
> mostly noise — know what they do, but don't sprinkle them everywhere.

---

## 2. The re-render model, reconciliation & keys

**When does a component re-render?** When its **state** changes, its **props**
change, its **context** value changes, or its **parent re-renders**. Re-rendering
≠ touching the DOM: React computes the new element tree, **reconciles** it against
the previous one (a diff), and commits only the actual DOM changes.

**Keys** give list items stable identity across renders so the diff matches the
right old node to the right new node:

```tsx
{visible.map((f) => <li key={f.id}>…</li>)}   // ✅ stable id
{visible.map((f, i) => <li key={i}>…</li>)}    // ❌ index — breaks on reorder/insert
```

Index keys cause subtle bugs (wrong item state after insert/delete/reorder) and
defeat reconciliation. Use a domain id.

**`memo`** still exists for the rare case the compiler doesn't cover, but with the
compiler enabled you rarely write it.

---

## 3. Keeping the UI responsive: `useDeferredValue` & `useTransition`

Both stop expensive updates from blocking user input (which protects **INP**).

```tsx
// useDeferredValue — the input is urgent, the filtered list can lag a tick
const [query, setQuery] = useState("");
const deferredQuery = useDeferredValue(query);
const isStale = query !== deferredQuery;       // show a subtle dimming
const visible = FEATURES.filter((f) => f.title.includes(deferredQuery));
```

```tsx
// useTransition — wrap a non-urgent state update so it doesn't block typing
const [isPending, startTransition] = useTransition();
startTransition(() => setTab(next));           // tab switch yields to input
```

**Difference:** `useDeferredValue` defers a **value** you already have;
`useTransition` defers a **state update** you're about to make. Same goal —
urgent work (typing/clicks) stays smooth; heavy work renders at lower priority.

---

## 4. Actions — `useActionState`, `useFormStatus`, `useOptimistic`

React 19 formalizes async UI mutations as **Actions**. The three hooks compose:

```tsx
// useActionState: holds state, runs the action on submit, exposes isPending
const [state, dispatch, isPending] = useActionState(async (prev, formData) => {
  const saved = await submitFeedback(formData);   // Server Action (Day 3)
  return { messages: [saved, ...prev.messages] };
}, { messages: initial });

// useOptimistic: render an instant optimistic copy, reconcile when the real
// result lands
const [optimistic, addOptimistic] = useOptimistic(
  state.messages,
  (cur, draft) => [draft, ...cur],
);

// useFormStatus: a CHILD of <form> reads the form's pending state
function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? "Posting…" : "Post"}</button>;
}
```

Flow: on submit, `addOptimistic` shows the message immediately (greyed, "sending…"),
the Server Action persists, then `useActionState` updates the real list and the
optimistic entry is reconciled away. `useFormStatus` must be rendered **inside**
the `<form>` (it reads the nearest form context). Because it's a real
`<form action>`, it works with **progressive enhancement** (submits before JS hydrates).

**`use()`** (the fourth React 19 API) reads a promise or context and can be called
**conditionally** (after an early return, inside a branch) — unlike other hooks.
Pass a server promise down and read it in a client child wrapped in `<Suspense>`.

---

## 5. `ref` as a prop + native document metadata

**`forwardRef` is gone.** A function component just accepts `ref` like any prop:

```tsx
// React 19 — no forwardRef wrapper
function TextInput(props: React.ComponentProps<"input">) {
  return <input {...props} />;   // ComponentProps already types `ref`
}
// caller:
const inputRef = useRef<HTMLInputElement>(null);
<TextInput ref={inputRef} />     // just works
```

**Native document metadata:** render `<title>`, `<meta>`, `<link>` anywhere in the
tree and React **hoists them into `<head>`**. (In Next, the Metadata API still owns
SEO tags — but the raw feature is real, proven below.)

---

## 6. Composition, context vs props, error boundaries

- **Composition over inheritance:** build UIs by passing `children`/render props,
  not class hierarchies. **Compound components** share implicit state via context
  (e.g. `<Tabs>`/`<Tabs.Panel>`), giving a clean API without prop-drilling.
- **Context vs props:** props for local, explicit data flow; **context** for
  cross-cutting values many components read (theme, auth, locale). Don't put
  fast-changing values in a wide context — every consumer re-renders on change
  (or split contexts / pass a stable promise — see Day 3's provider pattern).
- **Error boundaries:** `error.tsx` (a **Client Component**) catches render/runtime
  errors in its segment and shows fallback UI with a `reset()` to retry. Pair with
  Sentry reporting (Day 15). Note: error boundaries don't catch errors in event
  handlers or async code — handle those locally.

---

## Build Exercise — ✅ BUILT & RUNNING

Added to the Day 1–3 project (`nr-next-marketing/`):

| Concept | Where |
|---|---|
| **React Compiler enabled** | `next.config.ts` (`reactCompiler: true`) + `babel-plugin-react-compiler` |
| **Filterable card grid** (`useDeferredValue`, keys, no manual memo) | `src/components/feature-grid.tsx` |
| **Optimistic form** (`useActionState` + `useOptimistic` + `useFormStatus`) | `src/components/feedback-wall.tsx` |
| **Server Action** behind the form | `src/lib/feedback-actions.ts` |
| **`ref` as a prop** (no `forwardRef`) | `src/components/text-input.tsx` |
| **Native document metadata** (in-body `<meta>` → `<head>`) | `src/app/(marketing)/features/page.tsx` |
| **Error boundary** | `src/app/(marketing)/features/error.tsx` |

Run it:
```bash
cd nr-next-marketing
npm run dev          # http://localhost:3000/features
npm run build        # builds with the React Compiler (Babel) — note: a bit slower
```

---

## Hands-On Walkthrough — Day 4 Concepts Proven in This Project

### A. The React Compiler actually optimized every component
```
$ npx react-compiler-healthcheck
Successfully compiled 27 out of 27 components.
StrictMode usage not found.
Found no usage of incompatible libraries.
```
And the production build succeeds with `reactCompiler: true`:
```
▲ Next.js 16.2.7 (Turbopack)
✓ Compiled successfully in 2.6s
```
**What this proves:** the compiler is engaged and all our components are
compiler-safe — meaning the manual `useMemo`/`useCallback` we *didn't* write is
being inserted automatically at build time. (27/27 = none were skipped for rule
violations.)

### B. Native document metadata is hoisted to `<head>`
`features/page.tsx` renders `<meta name="x-demo" …>` in the **body** of the
component. The served HTML shows it landed in `<head>`:
```
<head> … <meta name="x-demo" content="react-19-metadata-hoisting"/>
        <title>Features — Pace</title> … </head>
x-demo before </head>: true
```
**What this proves:** React 19 hoists `<meta>`/`<title>`/`<link>` from anywhere in
the tree into the document head — no portal, no manual head management.

### C. The page is a static shell with hydrated islands
The server HTML already contains the prerendered shell; the interactive bits
hydrate on the client:
```
feedback seed in SSR body : 1   ("The new landing pages ship twice as fast")
feature card in SSR body  : 1   ("Partial Prerendering")
filter input in SSR body  : 1   ("Filter features…")
/features in build table  : ○  (Static)
```
**What this proves:** `/features` is a static shell (great FCP/SEO) and
`<FeatureGrid>`/`<FeedbackWall>` are client islands — the Day 1 server-shell +
client-island pattern, now with React 19 interactivity inside the islands.

### Try-it-yourself experiments
1. **Feel `useDeferredValue`:** open `/features`, type fast in the filter — the
   input never stutters; the grid dims (`isStale`) and catches up. Now imagine the
   grid were 5,000 items: deferring is what keeps INP green.
2. **See optimistic UI:** post feedback — your message appears instantly at 50%
   opacity with "sending…", then snaps to solid ~800ms later when the Server Action
   resolves. Throttle the network to exaggerate it.
3. **Prove no manual memo is needed:** there is zero `useMemo`/`useCallback` in
   `feature-grid.tsx`/`feedback-wall.tsx`, yet derived lists aren't recomputed
   needlessly — the compiler did it. Add `"use no memo"` to the top of
   `feature-grid.tsx`, rebuild, and the healthcheck count drops by one.
4. **Trigger the error boundary:** temporarily `throw new Error("boom")` at the top
   of `FeatureGrid`'s render → `features/error.tsx` shows the fallback + "Try again"
   (which calls `reset()`). Remove it.
5. **Break a key:** change `key={f.id}` to `key={i}` in the grid and reorder/filter
   — watch state attach to the wrong row. Revert.

---

## Self-Check Questions & Answers

**1. What does the React Compiler change about how you optimize React?**
It auto-memoizes at build time, so you stop hand-writing `useMemo`/`useCallback`/
`React.memo` for the common cases — derived values and child re-renders are
optimized for you. You write straightforward code; the compiler inserts the
memoization. You still need to follow the Rules of React (pure render, no mutating
props/state) — code that violates them is skipped, not optimized. It's opt-in
(`reactCompiler: true` + the Babel plugin) and trades slightly slower builds for the win.

**2. When does a React component re-render, and what's reconciliation?**
A component re-renders when its state changes, its props change, a context it
consumes changes, or its parent re-renders. Rendering produces a new element tree;
**reconciliation** is React diffing that tree against the previous one and
committing only the minimal real DOM mutations. Keys drive the diff for lists.

**3. Why not use the array index as a key?**
The key is how reconciliation matches old and new list items. The index isn't tied
to the item's identity, so on insert/delete/reorder React mismatches nodes —
producing wrong/leftover state, mis-applied animations, and input values jumping to
the wrong row. Use a stable domain id.

**4. `useDeferredValue` vs `useTransition` — when each?**
Both keep urgent interactions responsive by lowering the priority of heavy work.
`useDeferredValue` defers a **value you already have** (e.g. a search box's text)
so the expensive render that depends on it lags a tick. `useTransition` defers a
**state update you're triggering** (e.g. switching tabs/routes) and gives you an
`isPending` flag. Use deferred-value for derived/filtered UI from a fast input; use
transition when you control the dispatch and want pending feedback.

**5. How do `useActionState`, `useOptimistic`, and `useFormStatus` work together?**
`useActionState(reducer, initial)` wires a `<form>` to an async action and holds
the server-confirmed state plus `isPending`. `useOptimistic(base, updater)` renders
an instant optimistic version of that state so the UI updates before the server
responds, then reconciles to the real result. `useFormStatus()` — read by a child
of the form — exposes `pending` to drive the submit button. Together they give an
instant, accurate, progressively-enhanced form with no client `fetch` plumbing.

**6. What happened to `forwardRef` in React 19?**
It's no longer needed — `ref` is a regular prop. A function component can accept
`ref` in its props and forward it to a DOM node directly. `React.ComponentProps<"input">`
already includes the correct `ref` type. Less boilerplate, simpler types.

**7. How do you diagnose a slow React page?**
Measure first: React DevTools Profiler to find components re-rendering too often or
rendering too long, and the Performance panel / Web Vitals for INP. Common fixes:
defer heavy derived work (`useDeferredValue`/`useTransition`), give lists stable
keys, avoid putting fast-changing values in wide contexts, lift expensive work to
the server (RSC) so it never ships to the client, code-split with `dynamic()`, and
trust the compiler for memoization rather than guessing. Only hand-memoize when the
profiler shows a specific hot path the compiler didn't cover.

---

## Interview Soundbites (tie to your NBA.com / JPMC work)
- *"With the React Compiler I let the build handle memoization and keep components
  readable — I reach for `useMemo`/`useCallback` only when the profiler shows a real
  hot path, not by reflex."*
- *"For type-ahead/filter UIs I keep the input urgent and defer the heavy list with
  `useDeferredValue`, so typing never janks — that's how you protect INP on an
  interactive marketing page."*
- *"Mutations are Actions: `useActionState` + `useOptimistic` give an instant,
  progressively-enhanced form — the user sees their submission immediately while the
  Server Action persists and reconciles."*
- *"I keep pages as server shells with small client islands, give lists stable keys,
  and wrap risky segments in error boundaries that report to Sentry — fast first
  paint, resilient interactivity."*
