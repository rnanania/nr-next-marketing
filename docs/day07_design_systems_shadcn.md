# Day 7 — Design Systems: shadcn/ui, Radix & Figma

> Target: shadcn (CLI v4), Radix (unified `radix-ui`), React **19.2**, Tailwind
> **v4**, Next **16.2**. Builds on the Day 1–6 project. Theme: turn a designer's
> Figma into **production-ready, accessible, themeable components** — fast.

## Recap
| Topic | One-liner |
|---|---|
| **shadcn/ui** | **Not a dependency** — a CLI copies component *source* into your repo (`components/ui/`). You own and edit it. |
| **Radix primitives** | Unstyled, **accessible** behavior (focus trap, keyboard nav, aria) — shadcn styles them with Tailwind. |
| **`data-slot`** | Every shadcn part carries `data-slot="…"` — a stable styling/targeting hook (replaces the old `forwardRef`/className plumbing). |
| **`cva`** | `class-variance-authority` — declares component **variants** (`variant`, `size`) as class maps with type-safe props. |
| **`cn()`** | `clsx` + `tailwind-merge` — compose classes and resolve conflicts (Day 6). shadcn imports it from `@/lib/utils`. |
| **sonner** | The current toast — **`toast` component is deprecated**; `sonner` replaces it. |
| **new-york** | The default (and now only) shadcn style; unified `radix-ui` package; React 19 (no `forwardRef`). |
| **Theming** | shadcn tokens are CSS variables (`--primary`, `--border`…) → utilities (`bg-primary`). Edit tokens in `@theme`/`:root`. |

### Abbreviations
| Short | Full form |
|---|---|
| **DS** | Design System |
| **a11y** | Accessibility |
| **rhf** | react-hook-form |
| **cva** | class-variance-authority |
| **QA** | Quality Assurance (here: pixel/visual QA) |

---

## 1. The shadcn philosophy: copy-in, not install

Most libraries are a black-box dependency you import and can't change. **shadcn is
the opposite** — the CLI writes the component's *source* into your project, so you
own it: restyle it, add variants, fix a bug, no waiting on a maintainer. The
trade-off is you "own the updates" too, but for a marketing design system that
control is the point.

Under the hood each component wraps a **Radix primitive** (Dialog, Label, Slot, …)
that provides the hard part — **accessible behavior**: focus management, keyboard
interaction, `aria-*`, dismiss-on-escape. shadcn adds the Tailwind styling. So you
get **accessible by default** without hand-rolling ARIA.

---

## 2. What's current in shadcn (vs old tutorials)

| Old | Current (this project) |
|---|---|
| `default`/`new-york` styles | **new-york** only (the default) |
| `@radix-ui/react-*` per package | unified **`radix-ui`** package (`import { Dialog } from "radix-ui"`) |
| `forwardRef` wrappers | plain function components (**React 19 `ref` as prop**) |
| `toast`/`useToast` | **`sonner`** (`toast` deprecated) |
| className-only targeting | **`data-slot`** attributes on every part |
| `tailwind.config.js` theme | **`@theme`/CSS variables** (Tailwind v4) |

Proof from our generated `button.tsx`: it's a function component with
`data-slot="button"`, `cva` variants, and `Slot.Root` for `asChild` — no `forwardRef`.

---

## 3. The init/add workflow (what actually ran)

```bash
# 1) initialize: detects Next + Tailwind v4, writes components.json, base tokens,
#    a cn util, and the first component.
npx shadcn@latest init -d --base radix
#   → Found Next.js / Tailwind v4 ✓  · Writing components.json · Created
#     src/components/ui/button.tsx + src/lib/utils.ts · Updated globals.css

# 2) add components (source copied into src/components/ui/)
npx shadcn@latest add dialog sonner form input label
```

What I reconciled afterward:
- **One `cn`**: init created `src/lib/utils.ts`; I made it **re-export** our Day 6
  `src/lib/cn.ts` so there's a single implementation (shadcn imports `@/lib/utils`,
  our code imports `@/lib/cn` — same function).
- **`globals.css`**: init **merged** its tokens (`:root`/`.dark` `--primary`,
  `--border`, `@theme inline`, `@layer base`) **alongside** my Day 6 brand tokens,
  `@custom-variant dark`, `@utility`, and `@apply` — both systems coexist. Our pages
  keep their `surface`/`ink` look; shadcn components use `--primary`/`--border`/etc.
- **sonner**: shadcn wires it to `next-themes`; I rewired it to read our Day 6
  class-based theme via `useSyncExternalStore` (no `next-themes` provider needed).

`components.json` records the config (style, base color, aliases, tailwind v4) so
future `add`s match the project.

---

## 4. Variants with `cva` (the Button)

```tsx
const buttonVariants = cva("…base classes…", {
  variants: {
    variant: { default: "bg-primary …", outline: "border-border …", ghost: "…",
               secondary: "…", destructive: "…", link: "…" },
    size:    { default: "h-8 …", sm: "…", lg: "…", icon: "size-8", … },
  },
  defaultVariants: { variant: "default", size: "default" },
});
// Button props are typed from the cva config via VariantProps<typeof buttonVariants>
<Button variant="outline" size="sm">…</Button>
```

`cva` gives a **type-safe**, centralized variant system — the same pattern you'd use
for any component in a custom library. `asChild` (Radix `Slot`) lets a Button *become*
a `<Link>` while keeping its styles (`<DialogTrigger asChild><Button/></DialogTrigger>`).

---

## 5. Accessible Form: rhf + zod + `<Form*>`

shadcn's `<Form*>` primitives connect react-hook-form to the DOM with correct ARIA
**automatically**:

```tsx
<FormField name="email" control={form.control} render={({ field }) => (
  <FormItem>
    <FormLabel>Email</FormLabel>           {/* htmlFor = the control's id */}
    <FormControl><Input {...field} /></FormControl>  {/* sets aria-invalid + aria-describedby */}
    <FormDescription>…</FormDescription>   {/* id referenced by aria-describedby */}
    <FormMessage />                          {/* the validation error, with a stable id */}
  </FormItem>
)} />
```

`zodResolver(schema)` validates against a zod schema (Day 5), and errors flow into
`FormMessage` with the right `aria-describedby` linkage — screen-reader-friendly with
zero manual wiring.

---

## 6. Figma → code: a repeatable workflow

The interview question is *"a designer hands you a Figma file — walk me to
production."* The answer is a pipeline:

1. **Extract the design tokens** from Figma (color/spacing/radius/type styles) and
   map them **1:1 to `@theme` tokens** — no magic values. (Our mapping table:)
   | Figma style | Token | Utility |
   |---|---|---|
   | Brand/600 | `--color-brand-600` | `bg-brand-600` |
   | Radius/Card | `--radius-card` | `rounded-card` |
   | Space/Section | `--spacing-section` | `py-section` |
2. **Build on the primitives** — reach for an existing shadcn/Radix component; only
   hand-build when there's no primitive. Accessibility comes from Radix.
3. **Encode variants** with `cva` so the component matches every state in the Figma
   spec (default/hover/disabled, sizes).
4. **Pixel QA** — compare against the frame at the spec's breakpoints; check spacing
   scale, type scale, and states. Use the responsive breakpoints from Day 6.
5. **Document** the component (Storybook / a gallery page) so design + eng share one
   source of truth.

---

## 7. Documenting components: Storybook (and our live gallery)

**Storybook** is the standard for documenting/visual-testing a component library in
isolation:
```bash
npx storybook@latest init        # adds .storybook/ + *.stories.tsx
```
A story declares a component's states for the docs/visual-regression run:
```tsx
// button.stories.tsx
import { Button } from "@/components/ui/button";
export default { title: "UI/Button", component: Button };
export const Primary = { args: { children: "Button" } };
export const Variants = () => ["default","outline","ghost","destructive"].map(v =>
  <Button key={v} variant={v}>{v}</Button>);
```
In this project the **runnable documentation is a live gallery page**
(`/design-system`) that renders every component + states + the Figma→token table —
the same purpose, served by the app itself. (Storybook is the heavier, isolated
alternative; the story file above drops straight in if you run `storybook init`.)

> Bonus: the component library here can be pushed to a **claude.ai/design** design
> system via the `/design-sync` skill (the `DesignSync` tool) so design + eng review
> the same components — one at a time, incrementally.

---

## Build Exercise — ✅ BUILT & RUNNING

Added to the Day 1–6 project (`c1_study/c1-marketing/`):

| Concept | Where |
|---|---|
| `shadcn init` config | `components.json`, `src/lib/utils.ts` (re-exports Day 6 `cn`) |
| **Button** (cva variants/sizes) | `src/components/ui/button.tsx` |
| **Dialog** (Radix accessible modal) | `src/components/ui/dialog.tsx` |
| **Sonner** toasts (rewired to our theme) | `src/components/ui/sonner.tsx` + `<Toaster/>` in `layout.tsx` |
| **Form** primitives (rhf + zod, accessible) | `src/components/ui/form.tsx`, `input.tsx`, `label.tsx` |
| Demo form | `src/components/contact-form.tsx` |
| Toast demo | `src/components/toast-demo.tsx` |
| **Live component gallery** + Figma→token table | `src/app/(marketing)/design-system/page.tsx` |

Run it:
```bash
cd c1_study/c1-marketing
npm run dev        # http://localhost:3000/design-system  → toggle dark, open dialog, fire toasts, submit form
```

---

## Hands-On Walkthrough — Day 7 Concepts Proven in This Project

### A. Components carry `data-slot` and `cva` variants
From the served `/design-system` HTML:
```
data-slot="button" occurrences : 15
button variants rendered       : default destructive ghost link outline secondary
```
**What this proves:** these are real shadcn components (the `data-slot` styling hook
on every Button) and the full `cva` variant set renders from one config.

### B. The Form is accessible by construction
```
form labels (data-slot="form-label")   : 2
form controls (data-slot="form-control"): 2
label htmlFor ↔ input id                : for="…_R_…-form-item"  (matches the control id)
```
**What this proves:** `<FormLabel>`'s `htmlFor` is bound to the `<FormControl>`'s `id`,
and the control gets `aria-invalid`/`aria-describedby` — screen-reader-correct without
hand-written ARIA. (Submit a bad value in the browser to see `FormMessage` + the error
linkage appear.)

### C. Toasts and Dialog are wired
```
toast demo buttons present : 3   (success / error / promise)
dialog "Open dialog" trigger present (asChild Button merges data-slot → button)
```
**What this proves:** sonner is mounted via `<Toaster/>` in the root layout and the
Radix Dialog opens with built-in focus trap + ESC.

### D. It builds clean and stays static
```
✓ Compiled successfully · Finished TypeScript
○ /design-system   (Static)
```
**What this proves:** the gallery is a static shell with client islands for the
interactive parts — the Day 1 pattern, now with a real component library.

### Try-it-yourself experiments
1. **Open the Dialog** on `/design-system` → Tab cycles **inside** the modal (focus
   trap), ESC closes it, focus returns to the trigger — all from Radix.
2. **Fire toasts** → success/error/promise toasts appear; toggle dark mode and fire
   again — the toast colors follow our `@theme` tokens (no `next-themes`).
3. **Break the form** → submit with a 1-char name / bad email → inline `FormMessage`
   errors appear and the inputs get `aria-invalid` (inspect in DevTools).
4. **Add a variant** → add `warning: "bg-amber-500 text-white"` to `button.tsx`'s cva
   `variant` map → `<Button variant="warning">` is instantly type-safe and styled.
5. **Restyle, don't fork** → change `--primary` in `globals.css` `:root` → every
   shadcn component using `bg-primary` updates (you own the tokens).

---

## Self-Check Questions & Answers

**1. A designer hands you a Figma file — walk me to production-ready, accessible
components.**
First I extract the design tokens (color/spacing/radius/type) and map them 1:1 to
`@theme` tokens so there are no magic values. Then I build on primitives — reach for
an existing shadcn/Radix component (which brings accessibility: focus management,
keyboard, ARIA) and only hand-build when no primitive exists. I encode the spec's
states as `cva` variants (variant/size/disabled), do pixel QA against the frame at
each breakpoint, verify a11y (keyboard + screen reader + contrast), and document the
component in Storybook / a gallery so design and eng share one source of truth.

**2. What is shadcn/ui and how is it different from a component library?**
It's not an installed dependency — a CLI copies the component *source* into your repo
(`components/ui/`), so you own and can edit every component. That gives full control
(restyle, add variants, fix bugs immediately) at the cost of owning updates. It's
built on Radix primitives for accessibility and Tailwind for styling.

**3. Why Radix under shadcn?**
Radix provides unstyled, accessible **behavior** — focus trapping, keyboard
interaction, `aria-*`, dismissal — which is the hard, easy-to-get-wrong part. shadcn
styles those primitives with Tailwind. So components are accessible by default and you
don't reimplement a focus trap or combobox semantics by hand.

**4. What's `cva` and why use it?**
`class-variance-authority` declares a component's variants (e.g. `variant`, `size`) as
maps of class strings with `defaultVariants`, and `VariantProps` derives the prop
types. You get a centralized, type-safe variant system — one place defines how a
Button looks in every state, and the props are checked at compile time.

**5. What changed in current shadcn vs older tutorials?**
new-york is the only style; the unified `radix-ui` package replaces per-component
`@radix-ui/react-*`; components are plain function components (React 19 `ref`-as-prop,
no `forwardRef`); every part has a `data-slot` styling hook; `sonner` replaces the
deprecated `toast`; and theming is CSS-variable/`@theme`-based for Tailwind v4.

**6. How do you keep shadcn components on-brand and themeable?**
shadcn components reference CSS-variable tokens (`bg-primary`, `border-border`, …)
defined in `:root`/`.dark` and exposed via `@theme`. Rebranding is editing those
tokens — every component updates at once. Because you own the source, you can also add
brand-specific variants via `cva`. Dark mode is a class toggle that re-points the
token values (Day 6).

**7. How do you document and visually test a component library?**
Storybook in isolation (a `*.stories.tsx` per component declaring its states) for docs
and visual-regression testing, or a live gallery page in the app that renders every
component and state. Either way the goal is one shared, reviewable source of truth for
design and engineering; pair it with a11y checks (axe) and pixel QA against Figma.

---

## Interview Soundbites (tie to your NBA.com / JPMC work)
- *"I treat shadcn as owned source, not a dependency — Radix gives accessibility,
  Tailwind tokens give theming, and `cva` gives type-safe variants, so I can match a
  Figma spec exactly and still control every line."*
- *"Figma maps straight onto `@theme` tokens — color/spacing/radius become variables
  and utilities, so there are no magic values and a rebrand is a token edit."*
- *"Forms are react-hook-form + zod behind shadcn's `<Form*>` primitives, which wire
  `aria-invalid`/`aria-describedby` and label/error linkage automatically — accessible
  without hand-rolled ARIA."*
- *"I document components in a gallery/Storybook so design and eng review the same
  source of truth, and I QA against the Figma frame at each breakpoint for pixel
  fidelity."*
