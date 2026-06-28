# Day 6 — Tailwind CSS in Depth (v4.3)

> Target: Tailwind **v4.3**, Next **16.2**. Builds on the Day 1–5 project
> (`c1_study/c1-marketing/`). v4 is a big departure from v3 — **CSS-first config**,
> a new engine, OKLCH colors, built-in container queries. Know what changed and how
> to keep a Tailwind codebase **consistent and small** at scale.

## Recap
| Topic | One-liner |
|---|---|
| **CSS-first config** | No `tailwind.config.js`. The design system lives in CSS: `@import "tailwindcss"` + `@theme { … }`. |
| **`@theme` tokens** | A token like `--color-brand-500` becomes **both** a CSS variable **and** utilities (`bg-brand-500`, `text-brand-500`). |
| **Automatic content detection** | No `content: [...]` array — v4 finds your templates itself. |
| **OKLCH colors** | Default palette (and your tokens) authored in **OKLCH** (perceptually uniform, wide gamut). Toolchain downlevels for old browsers. |
| **Container queries (built-in)** | `@container` + `@md:`/`@4xl:` — style by a **parent's width**, not the viewport. |
| **`@custom-variant`** | Define variants in CSS, e.g. class-based dark mode: `@custom-variant dark (&:where(.dark, *))`. |
| **`@utility` / `@apply`** | Author real custom utilities (variant-aware) / compose utilities into a component class. |
| **`cn()`** | `clsx` + `tailwind-merge` — conditionally join classes and **resolve conflicts** (last wins). |

### Abbreviations
| Short | Full form |
|---|---|
| **OKLCH** | Oklab Lightness-Chroma-Hue color space |
| **CWV** | Core Web Vitals |
| **DX** | Developer Experience |
| **CSS var** | CSS custom property (`--name`) |

---

## 1. What changed in v4 (the interview answer)

| | v3 | v4 |
|---|---|---|
| Config | `tailwind.config.js` (JS) | **CSS-first**: `@theme` in your CSS |
| Import | `@tailwind base/components/utilities` | one line: `@import "tailwindcss"` |
| Content | manual `content: [...]` globs | **automatic** detection |
| Colors | hex/HSL | **OKLCH** palette |
| Container queries | plugin | **built-in** (`@container`) |
| Engine | PostCSS/JS | new high-perf engine (Oxide/Lightning CSS), faster builds |
| Tokens | JS theme object | **CSS variables** (usable anywhere, even inline/runtime) |

Setup in this project (`src/app/globals.css`):
```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));   /* class-based dark mode */
@theme { --color-brand-500: oklch(0.62 0.19 256); /* … */ }
```
PostCSS is just `@tailwindcss/postcss` — no config file anywhere in the repo.

---

## 2. `@theme` — tokens that become variables *and* utilities

Declare a token once; get a CSS variable **and** the matching utilities for free:

```css
@theme {
  --color-brand-600: oklch(0.55 0.2 256);   /* → bg-brand-600, text-brand-600, ring-brand-600 … */
  --spacing-section: 5rem;                   /* → p-section, py-section, space-y-section, gap-section */
  --radius-card: 0.875rem;                   /* → rounded-card */
  --breakpoint-3xl: 120rem;                  /* → 3xl: variant */
}
```

This is the **consistency** lever: every component pulls from the same tokens, so
rebrand = edit the tokens, not 200 files. Reference the variable directly when you
need to (`var(--color-brand-600)`), or as a utility in markup.

---

## 3. OKLCH — and how it actually ships

OKLCH = **L**ightness / **C**hroma / **H**ue. Equal lightness steps *look* equally
spaced (unlike HSL), so a scale is easy to design and wide-gamut displays get richer
color. You author tokens in OKLCH; the toolchain (Lightning CSS) **downlevels** them
to what the configured browsers support. Proven from the built CSS for our
`--color-brand-500: oklch(0.62 0.19 256)`:

```css
/* legacy fallback (no wide-gamut support) */
--color-brand-500: #2584f5;
/* modern, wide-gamut path */
@supports (color: lab(0% 0 0)) {
  --color-brand-500: lab(54.432% 5.07051 -65.5236);
}
```

So `oklch(...)` doesn't appear literally in output, but wide-gamut color **does**
ship (via `lab()` under `@supports`) with a hex fallback for old browsers — automatic
progressive enhancement. The design benefit (uniform scale) holds either way.

---

## 4. Dark mode & runtime theme switching

By default `dark:` keys off `prefers-color-scheme`. To let users **override** the
system, redefine the variant to a class and toggle that class at runtime:

```css
@custom-variant dark (&:where(.dark, .dark *));   /* dark: now means ".dark ancestor" */
.dark { --color-surface: oklch(0.18 0.01 256); --color-ink: oklch(0.96 0 0); }
```

Components reference **semantic tokens** (`bg-surface`, `text-ink`), so flipping the
`.dark` class re-points those variables and the whole app re-themes — just a class
change, no re-render. `ThemeToggle` writes the choice to `localStorage`; a tiny
**no-flash script** in `<head>` applies it before first paint:

```html
<script>(function(){var t=localStorage.getItem('theme');
  var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark',d);})()</script>
```

---

## 5. Responsive, container queries, state variants, `group`/`peer`

```html
<!-- viewport breakpoints: hero type scales up -->
<h1 class="text-3xl sm:text-4xl lg:text-5xl">…</h1>

<!-- CONTAINER query: cards reflow on the CONTAINER's width, not the window -->
<div class="@container">
  <ul class="grid grid-cols-1 @md:grid-cols-2 @4xl:grid-cols-4">…</ul>
</div>

<!-- group: child reacts to ancestor hover -->
<li class="group"> <span class="group-hover:translate-x-1">→</span> </li>

<!-- peer: label reacts to sibling input state (floating label) -->
<input class="peer" placeholder=" " />
<label class="peer-focus:text-brand-600 peer-[:not(:placeholder-shown)]:top-1.5">Email</label>
```

Container queries are the marketing-site superpower: a card component looks right in a
narrow sidebar **and** a wide grid because it responds to *its* space, not the page.

---

## 6. `@apply`, `@utility`, `cn()` — lean, consistent markup

```css
/* @utility: a real utility — works with variants (hover:card-elevated, md:card-elevated) */
@utility card-elevated { border-radius: var(--radius-card); box-shadow: …; }

/* @apply: compose utilities into a semantic class for repeated UI */
@layer components { .btn-brand { @apply rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700; } }
```

```ts
// cn(): conditional joins + conflict resolution (clsx + tailwind-merge)
cn("px-2", "px-4")                  // → "px-4"           (last wins)
cn("p-2", cond && "hidden", "bg-red-500")
```

**Avoiding class bloat / staying consistent at scale:**
- Tokens in `@theme` (one source of truth) → no magic values.
- `@apply`/`@utility` for genuinely repeated patterns (buttons, cards) — but don't
  `@apply` everything (that recreates CSS-in-the-wrong-place); prefer composing in JSX.
- `cn()` so a base component class + a prop override don't both survive into the DOM.
- Extract repeated markup into a component, not a giant class string copy-pasted around.

---

## 7. Production CSS size & performance

v4 ships **one** CSS file with only the utilities you used (automatic detection), so
it stays small and cache-friendly — good for LCP/CWV. This project's entire stylesheet:
```
32,460 bytes raw  →  6,571 bytes gzipped   (one file, all routes)
```
Tokens-as-variables also mean theme switching costs **nothing** at runtime (no
recompiled CSS, just a class flip), and the new engine keeps dev/build fast.

---

## Build Exercise — ✅ BUILT & RUNNING

Added to the Day 1–5 project (`c1_study/c1-marketing/`):

| Concept | Where |
|---|---|
| **`@theme` design system** (OKLCH brand scale, semantic tokens, custom spacing/radius/breakpoint) | `src/app/globals.css` |
| **Class-based dark mode** (`@custom-variant`) + token override | `src/app/globals.css` |
| **`@utility card-elevated` + `@apply .btn-brand`** | `src/app/globals.css` |
| **Runtime theme toggle** + no-flash script | `src/components/theme-toggle.tsx`, `src/app/layout.tsx` |
| **`cn()` helper** (clsx + tailwind-merge) | `src/lib/cn.ts` |
| **Responsive hero + container-query feature grid + group/peer** | `src/app/(marketing)/showcase/page.tsx` |

Run it:
```bash
cd c1_study/c1-marketing
npm run dev            # http://localhost:3000/showcase  → toggle dark in the header
npm run build          # one small CSS file for the whole site
```

---

## Hands-On Walkthrough — Day 6 Concepts Proven in This Project

### A. `@theme` tokens became variables *and* utilities
From the built CSS:
```
--color-brand-500 defined : yes
bg-brand-600 class present : yes        ← utility generated from the token
--radius-card: .875rem                  ← custom token → rounded-card
space-y-section → margin: var(--spacing-section)   ← custom spacing token (5rem)
```
**What this proves:** one `@theme` declaration produces both the CSS variable and the
utility classes — no JS config, no `content` array.

### B. OKLCH is downleveled with progressive enhancement
For `--color-brand-500: oklch(0.62 0.19 256)` the output contains:
```
--color-brand-500: #2584f5;                              ← fallback
@supports (color: lab(0% 0 0)) { --color-brand-500: lab(54.432% 5.07051 -65.5236) }  ← wide gamut
```
**What this proves:** you author in OKLCH; the engine emits a hex fallback **and** a
wide-gamut `lab()` path under `@supports` — old browsers stay correct, modern ones get
richer color, automatically.

### C. Custom utilities and `@apply` compiled
```
card-elevated (@utility) : present
btn-brand (@apply)       : present
@container references     : 3
.dark token override      : .dark{--color-surface:#0f1216; --color-ink:…}
```
**What this proves:** `@utility`, `@apply`, container queries, and the class-based dark
override all made it into the stylesheet from CSS-first config.

### D. `cn()` resolves conflicting utilities
```
cn("px-2","px-4")       → px-4
cn("p-2", false, "bg-red-500") → p-2 bg-red-500
cn("text-sm text-lg")   → text-lg
```
**What this proves:** `tailwind-merge` drops the losing side of a conflict so a base
class + an override don't both reach the DOM (where source order would decide).

### E. Runtime theming works, no flash
Served `/showcase` HTML:
```
no-flash script in <head> : 1
ThemeToggle button         : 1     ("Switch to dark/light mode")
btn-brand in HTML          : 2
card-elevated in HTML      : present
```
And the whole site is **one 6.6KB-gzipped CSS file**. **What this proves:** the theme
applies before paint (no flicker), the toggle is wired, and the design system ships tiny.

### Try-it-yourself experiments
1. **Toggle the theme:** load `/showcase`, click 🌙/☀️ in the header — the `.dark`
   class flips on `<html>`, semantic tokens swap, the whole site re-themes instantly.
   Reload — your choice persists with no flash.
2. **Rebrand in one place:** change `--color-brand-500/600` in `globals.css`, rebuild —
   every `bg-brand-*`/`btn-brand`/hero gradient updates at once.
3. **Container vs viewport:** on `/showcase`, narrow the browser — the feature grid
   reflows by the `@container` width. Put the same `@container` block in a narrow
   sidebar and it reflows there too, independent of the window.
4. **See conflict resolution:** in a component, write `cn("p-2", "p-6")` and inspect the
   DOM — only `p-6` survives.
5. **Inspect the bundle:** `find .next/static -name '*.css'` → one file; only the
   utilities you used are present (automatic content detection).

---

## Self-Check Questions & Answers

**1. What changed in Tailwind v4?**
It went **CSS-first**: no `tailwind.config.js` — you configure the design system in CSS
with `@import "tailwindcss"` and `@theme { … }`, where each token becomes both a CSS
variable and utilities. Content detection is **automatic** (no `content` array), the
default palette and tokens are **OKLCH**, **container queries** are built in, and a new
engine makes builds faster. Tokens-as-variables also enable runtime theming for free.

**2. How do `@theme` tokens work, and why is that good for consistency?**
A token like `--color-brand-500` declared in `@theme` generates the CSS variable **and**
the matching utilities (`bg-brand-500`, etc.). Because every component references the
same tokens, the design system has a single source of truth — rebranding or adjusting
spacing is a token edit, not a find-replace across the codebase. It eliminates magic
values and keeps the look coherent at scale.

**3. What is OKLCH and what actually ships to the browser?**
OKLCH is a perceptually-uniform color space (Lightness/Chroma/Hue) — equal steps look
equal, and it reaches wide-gamut colors. You author in OKLCH; the toolchain downlevels
it: a hex/rgb fallback for older browsers plus a wide-gamut `lab()`/`oklch()` value
under `@supports` for capable ones. So you get nicer color design and automatic
progressive enhancement.

**4. How do you implement runtime (user-toggleable) dark mode?**
Redefine the `dark:` variant to be class-based with `@custom-variant dark (&:where(.dark, .dark *))`,
put dark values on `.dark` (ideally by overriding **semantic tokens** like
`--color-surface`), and toggle the `.dark` class on `<html>` from a client component,
persisting to `localStorage`. Add a small inline no-flash script in `<head>` to apply
the saved/system choice before first paint so there's no light→dark flicker.

**5. Container queries vs media queries — when each?**
Media queries (`sm:`/`lg:`) respond to the **viewport**; container queries
(`@container` + `@md:`) respond to a **parent element's width**. Use container queries
for reusable components that live in different-width slots (a card in a sidebar vs a
full-width grid) so they look right regardless of where they're placed — exactly what
you want for a component library on a marketing site.

**6. How do you keep a Tailwind codebase consistent and small at scale?**
Centralize design decisions in `@theme` tokens (one source of truth, no magic values);
extract repeated UI into components rather than copy-pasted class strings; use
`@apply`/`@utility` for genuinely repeated primitives (buttons/cards) but not for
everything; use `cn()` (clsx + tailwind-merge) so base classes and overrides don't
conflict in the DOM; and rely on automatic content detection so the output ships only
the utilities you actually use (here: one ~6.6KB-gzipped file for the whole site).

**7. What does `cn()` do and why do you need `tailwind-merge`?**
`cn()` joins class names conditionally (clsx) and **resolves Tailwind conflicts**
(tailwind-merge) so the last utility in a conflicting pair wins. Without it, a base
component class (`px-2`) and a prop override (`px-4`) both land in the DOM and CSS
source order — not your intent — decides which applies. `tailwind-merge` makes overrides
predictable: `cn("px-2","px-4") → "px-4"`.

---

## Interview Soundbites (tie to your NBA.com / JPMC work)
- *"Tailwind v4 moved config into CSS — I define the design system as `@theme` tokens in
  OKLCH, so each token is a variable and a utility, and a rebrand is a one-file change."*
- *"Dark mode is a class on `<html>` flipping semantic tokens, with a no-flash script in
  the head — instant runtime theming with zero recompiled CSS."*
- *"For a component library I lean on container queries so a card looks right in a
  sidebar or a full-width grid — it responds to its container, not the viewport."*
- *"I keep Tailwind lean with tokens, `cn()` for predictable overrides, and automatic
  content detection — the whole site here is one ~6.6KB-gzipped stylesheet, which keeps
  LCP fast."*
