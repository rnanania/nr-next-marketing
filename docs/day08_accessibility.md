# Day 8 — Accessibility (WCAG 2.2 / A11y)

> Target: WCAG **2.2 AA**, the existing Day 1–7 marketing site. Unlike other days,
> the build here is an **audit & fix** of everything already shipped — bringing the
> whole site to AA — plus wiring a11y checks into the lint/CI loop.

## Recap
| Topic | One-liner |
|---|---|
| **POUR** | The 4 WCAG principles: **P**erceivable, **O**perable, **U**nderstandable, **R**obust. |
| **Conformance A / AA / AAA** | Levels of strictness. **AA** is the legal/industry target (ADA, EN 301 549). |
| **Semantic HTML first** | Use the right element (`<button>`, `<nav>`, `<main>`, `<h1>`) — it brings behavior + a11y for free. |
| **Landmarks** | `header`/`nav`/`main`/`footer` (+ `aria-label` when repeated) let AT users jump between regions. |
| **ARIA** | Adds roles/states *when no native element fits*. First rule of ARIA: **don't use ARIA** if HTML can do it. |
| **Keyboard** | Everything operable without a mouse; visible focus; logical order; skip link; focus trap in modals. |
| **Contrast** | Normal text ≥ **4.5:1**, large text (≥24px / 18.66px bold) ≥ **3:1** (WCAG 1.4.3). |
| **Reduced motion** | Honor `prefers-reduced-motion` (WCAG 2.3.3) — minimize animation for users who opt out. |

### Abbreviations
| Short | Full form |
|---|---|
| **AT** | Assistive Technology (screen readers, etc.) |
| **SR** | Screen Reader (VoiceOver, NVDA, JAWS) |
| **WCAG** | Web Content Accessibility Guidelines |
| **a11y** | Accessibility |
| **AA** | The middle (target) conformance level |

---

## 1. WCAG 2.2, POUR, and what 2.2 added

WCAG organizes success criteria under **POUR**. Target **level AA**. WCAG **2.2**
(the current version) added criteria worth knowing:
- **2.4.11 Focus Not Obscured** — the focused element can't be hidden behind sticky headers/toolbars.
- **2.5.8 Target Size (Minimum)** — interactive targets ≥ 24×24 CSS px.
- **3.3.8 Accessible Authentication** — don't force cognitive tests (e.g. typing back a code) with no alternative.

Mental model: **perceivable** (contrast, text alternatives), **operable** (keyboard,
focus, no traps), **understandable** (labels, errors, consistent nav), **robust**
(valid semantics that AT can parse).

---

## 2. Semantic HTML & landmarks (the foundation)

90% of a11y is using the right element. A real `<button>` is focusable, clickable by
Enter/Space, and announced as a button — a `<div onClick>` is none of those. The site
uses landmark elements so AT users can navigate by region:

```tsx
<header> … <nav aria-label="Primary"> … </nav> </header>
<main id="main" tabIndex={-1}> {children} </main>
<footer> … </footer>
```

- `aria-label="Primary"` distinguishes the nav when there could be more than one.
- One **`<h1>` per page**, then `<h2>`/`<h3>` in order (no skipped levels) — the SR
  "headings list" is how many users skim a page.

---

## 3. ARIA — and when *not* to use it

> **First rule of ARIA: don't use ARIA.** A native element is always better than a
> `role` you bolt on. Bad ARIA is worse than none.

Use ARIA only to fill gaps native HTML can't:
- **State**: `aria-expanded` (the header hamburger), `aria-pressed` (filter toggles).
- **Relationships**: `aria-controls`, `aria-describedby` (form errors), `aria-label`
  for controls without visible text (the theme toggle, icon buttons).
- **Live regions**: `aria-live="polite"` so SRs announce async updates (the subscribe
  result, the feedback error) without moving focus.

This site already used these correctly; the audit added the missing pieces (below).

---

## 4. Keyboard: skip link, focus order, visible focus, traps

- **Skip link** (2.4.1): a first-in-DOM link, hidden until focused, that jumps past
  the nav to `#main`. Keyboard users don't have to Tab through 11 nav links on every page.
  ```tsx
  <a href="#main" className="sr-only focus:not-sr-only focus:fixed …">Skip to content</a>
  <main id="main" tabIndex={-1}> … </main>   {/* tabIndex=-1 so focus can land here */}
  ```
- **Visible focus** (2.4.7): a global `:focus-visible` outline guarantees every
  interactive element shows a focus ring **for keyboard users only** (not on mouse click):
  ```css
  a:focus-visible, button:focus-visible, input:focus-visible, [tabindex]:focus-visible {
    outline: 2px solid var(--color-brand-500); outline-offset: 2px;
  }
  ```
- **Focus trap**: the Radix `Dialog` (Day 7) traps Tab inside the open modal, restores
  focus to the trigger on close, and closes on ESC — for free.
- **Focus order** = DOM order; we don't reorder with positive `tabindex` (an anti-pattern).

---

## 5. Color contrast — measured and fixed

The biggest real failure was muted text using `/50` and `/40` opacities. I computed
the actual WCAG ratios and fixed them to AA:

| Pair | Ratio | Verdict | Fix |
|---|---|---|---|
| `text-black/40` on white | **2.85:1** | ❌ FAIL | → `/60` |
| `text-black/50` on white | **3.95:1** | ❌ FAIL (normal) | → `/60` |
| `text-black/60` on white | **5.74:1** | ✅ PASS | kept |
| `text-white/40` on dark | **3.71:1** | ❌ FAIL | → `/60` |
| `text-white/60` on dark | **6.61:1** | ✅ PASS | kept |
| white **/80** on `brand-500` hero | **2.90:1** | ❌ FAIL | darken gradient |
| white **/80** on `brand-700` hero | **5.46:1** | ✅ PASS | `from-brand-700 to-brand-900` |
| arrow `text-brand-500` on surface | **3.69:1** | ❌ FAIL (normal) | → `brand-600` (5.51:1) |

Lesson: **opacity-based muted text is a contrast trap** — `/50` looks fine but fails
AA. Verify with numbers, not eyeballs.

### Cross-theme contrast (a color that passes light can fail dark)

A second, sneakier class: **fixed palette colors that don't adapt to theme.**
`text-blue-600` links passed on white (5.17:1) but **failed on the dark surface
`#0f1216`** (3.63:1) — and the inverse for light shades. The fix is a theme-aware
pair that passes in **both** themes:

| Role | Old (single color) | New (theme-aware) | Light | Dark |
|---|---|---|---|---|
| Link / accent | `text-blue-600` | `text-brand-600 dark:text-brand-300` | 4.94:1 ✅ | 9.38:1 ✅ |
| Error text | `text-red-600` | `text-red-600 dark:text-red-400` | 4.83:1 ✅ | 6.79:1 ✅ |
| Success text | `text-green-600` | `text-green-700 dark:text-green-400` | 5.02:1 ✅ | 10.78:1 ✅ |

(`text-green-600` actually **failed on light** at 3.30:1 — proof you must check *both*
themes, not assume one.) Note: `bg-blue-600` buttons are fine untouched — white on an
**opaque** background is theme-independent (5.17:1 in both). The trap is only *text*
colors sitting on a theme-variable surface.

### Non-text contrast (WCAG 1.4.11) — input borders

1.4.11 requires **UI component boundaries to be ≥ 3:1**. Since our inputs share the
page's surface color (no fill to distinguish them), the **border is the only boundary
indicator** — so it must clear 3:1. The opacity borders failed:

| Border | Was | Ratio | Now | Ratio |
|---|---|---|---|---|
| Light (on white) | `border-black/15` | 1.41:1 ❌ | `border-black/45` | 3.36:1 ✅ |
| Dark (on `#0f1216`) | `border-white/20` | 1.84:1 ❌ | `border-white/35` | 3.21:1 ✅ |

Applied to inputs and bordered buttons (9 files). Decorative **card** borders
(`border-black/10`) are exempt — they don't identify a control — and were left as is.

### Gotcha: CSS source order broke every shadcn dark token

A subtle one surfaced as an **invisible `link`-variant button in dark mode**. The
shadcn merge left the dark token block (`.dark { --primary: … }`) *before* the light
`:root { --primary: … }` block in `globals.css`. Both selectors match
`<html class="dark">` with **equal specificity (0,1,0)**, so the later one (`:root`,
light) won — meaning `--primary` stayed near-black even in dark mode, and
`text-primary` (the link button) rendered black-on-black.

Fix: bump the dark block's specificity so it always wins regardless of order:
```css
:root.dark { … }   /* (0,2,0) beats :root (0,1,0) */
```
Proof from the compiled CSS: light `--primary:#171717`, dark `--primary:#e5e5e5`.
This repaired **all** shadcn dark tokens (card/secondary/muted-foreground/border/…),
which had all been falling back to their light values. Lesson: when CSS variable
themes tie on specificity, **source order decides** — and a merge can silently flip it.

---

## 6. Reduced motion & accessible forms

- **Reduced motion** (2.3.3): a global media query collapses animations/transitions
  for users who opt out (vestibular safety):
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
  }
  ```
- **Forms**: every input has a programmatic label — visible `<label htmlFor>` (the
  shadcn `Form`, Day 7) or `aria-label` where there's no visible label (the feedback
  inputs, the search box). Errors are linked via `aria-describedby` + `aria-invalid`
  and announced through `aria-live`. **Placeholders are not labels** — that was a fix.

---

## 7. Testing a11y (the toolchain)

| Tool | Catches | When |
|---|---|---|
| **eslint-plugin-jsx-a11y** | static issues (missing alt, label, bad role/aria) | every save / CI lint |
| **axe** (DevTools / `@axe-core`) | ~57% of issues incl. contrast, names, roles | in-browser / e2e |
| **Lighthouse** | a11y score + best practices | CI / manual |
| **Screen reader** (VoiceOver `⌘F5`) | the real experience — order, names, announcements | manual, irreplaceable |

Automated tools catch maybe half; **manual keyboard + SR testing is mandatory**. In
this project I enabled the **full jsx-a11y recommended** ruleset (Next ships only a
subset) so a11y regressions fail the lint in CI.

---

## Audit & Fix — ✅ DONE (whole site to AA)

| Issue found | Fix | Where |
|---|---|---|
| No skip link | `sr-only` skip link → `#main` | `src/app/layout.tsx` |
| `<main>` not a focus target | `id="main"` + `tabIndex={-1}` + `scroll-mt` | `src/app/(marketing)/layout.tsx` |
| Nav landmarks unlabeled | `aria-label="Primary"` on both navs | `src/components/site-header.tsx` |
| Muted text `/40`,`/50` failed contrast | bumped to `/60` (24 instances) | all pages/components |
| Hero white text failed on light gradient | gradient `from-brand-700 to-brand-900` | `src/app/(marketing)/showcase/page.tsx` |
| **Links/status colors failed in dark theme** | theme-aware pairs (`text-brand-600 dark:text-brand-300`, etc.) | links, form messages (7+ files) |
| Input/control borders < 3:1 (WCAG 1.4.11) | `border-black/15`→`/45` (3.36:1), `border-white/20`→`/35` (3.21:1) | inputs + bordered buttons (9 files) |
| Feedback inputs were placeholder-only | added `aria-label` | `src/components/feedback-wall.tsx` |
| No guaranteed visible focus | global `:focus-visible` outline | `src/app/globals.css` |
| No reduced-motion handling | `prefers-reduced-motion` block | `src/app/globals.css` |
| a11y not enforced in CI | full `jsx-a11y` recommended ruleset | `eslint.config.mjs` |

Run the checks:
```bash
cd c1_study/c1-marketing
npx eslint src          # jsx-a11y recommended — clean
npm run build           # type-safe, clean
# manual: Tab through any page (skip link → focus rings → dialog trap); VoiceOver ⌘F5
```

---

## Hands-On Walkthrough — Day 8 Proven in This Project

### A. Contrast ratios computed before/after
A WCAG luminance script over our actual compiled colors:
```
black/40 on white : 2.85:1 FAIL        → black/60 : 5.74:1 PASS
black/50 on white : 3.95:1 FAIL(normal)→ black/60 : 5.74:1 PASS
white/40 on dark  : 3.71:1 FAIL        → white/60 : 6.61:1 PASS
white/80 on brand-500 hero: 2.90:1 FAIL→ on brand-700: 5.46:1 PASS
arrow brand-500 on surface: 3.69:1 FAIL→ brand-600 : 5.51:1 PASS
```
**What this proves:** every muted-text and hero color now clears AA — measured, not guessed.

### B. Structural a11y is in the served HTML
```
skip link "Skip to content"     : present (sr-only, reveals on focus)
<main id="main" tabindex="-1">   : present
<nav aria-label="Primary">       : present
feedback inputs aria-label       : 2 labelled
<html lang="en">                 : present
<h1> count on home               : 1 (single top-level heading)
```

### C. Focus + motion handling shipped in CSS
```
:focus-visible outline rules : 28 occurrences in the bundle
prefers-reduced-motion block : present
```
**What this proves:** keyboard users get a visible focus ring everywhere, and
motion-sensitive users get a near-static experience.

### D. a11y enforced at lint time
```
$ npx eslint src     # with jsx-a11y recommended (not just Next's subset)
(exit 0 — no violations)
```
**What this proves:** accessibility regressions now fail CI, not just review.

### Try-it-yourself experiments
1. **Skip link:** load any page, press **Tab** once → "Skip to content" appears;
   Enter jumps focus into `<main>`.
2. **Focus visibility:** Tab through the header → every link/button shows the brand
   outline; click one with the mouse → no outline (`:focus-visible` distinguishes input modality).
3. **Dialog trap:** open the dialog on `/design-system` → Tab stays inside; ESC closes;
   focus returns to the trigger.
4. **Reduced motion:** System Settings → Accessibility → Reduce Motion, reload
   `/features` → the deferred-list fade and card hover transitions go instant.
5. **Screen reader:** VoiceOver (`⌘F5`) → use the rotor (`⌃⌥U`) to list landmarks and
   headings — you can jump straight to `main` and skim the `<h1>/<h2>` outline.
6. **Lint guard:** delete an `aria-label` from a feedback input → `npx eslint src`
   fails (`jsx-a11y/control-has-associated-label`/label rule). Restore it.

---

## Self-Check Questions & Answers

**1. How do you ensure accessibility across all pages?** *(direct JD line)*
Start with semantic HTML and landmarks so structure is correct by default, then layer
the essentials on every page: one logical heading outline, labelled controls,
keyboard operability with visible focus and a skip link, AA color contrast, honored
reduced-motion, and ARIA only where native HTML falls short. Enforce it continuously —
`jsx-a11y` in CI lint, axe/Lighthouse in the e2e/CI run — and validate the real
experience with keyboard-only and screen-reader passes, since automation catches only
about half. Bake it into the component library (Radix/shadcn) so accessibility is
inherited, not re-litigated per page.

**2. What does "AA" mean and why that level?**
WCAG defines three conformance levels — A (minimum), AA (target), AAA (enhanced). AA is
the practical and legal standard (referenced by the ADA, Section 508, EN 301 549), so
it's what teams commit to. AAA is stricter (e.g. 7:1 contrast) and not feasible
site-wide.

**3. When should you use ARIA, and when not?**
Use a native element whenever one exists — it brings focus, keyboard, and role for
free. Reach for ARIA only to express things HTML can't: state (`aria-expanded`,
`aria-pressed`), relationships (`aria-describedby`, `aria-controls`), accessible names
for icon-only controls (`aria-label`), and live regions. The first rule of ARIA is not
to use ARIA — incorrect ARIA (wrong role, stale state) actively misleads AT and is
worse than none.

**4. How do you handle color contrast, and what are the thresholds?**
Normal text needs ≥ 4.5:1, large text (≥ 24px, or 18.66px bold) ≥ 3:1, and UI
components/graphical objects ≥ 3:1 (1.4.11). I verify with computed ratios, not by eye
— opacity-based muted text is a common trap (our `text-black/50` was only 3.95:1 and
failed; `/60` is 5.74:1 and passes). Define color via tokens so the whole system stays
above threshold in both themes.

**5. What's required for keyboard accessibility?**
Everything operable without a mouse: real interactive elements, a logical focus order
(= DOM order, no positive `tabindex`), a clearly visible focus indicator
(`:focus-visible`), a skip link to bypass repeated nav, no keyboard traps (and a proper
focus trap *only* inside modals, with focus restored on close), and Esc to dismiss
overlays. WCAG 2.2 adds that focus must not be obscured by sticky UI.

**6. How do you test accessibility?**
Layered: `eslint-plugin-jsx-a11y` at author/CI time for static issues; axe (DevTools or
`@axe-core` in e2e) and Lighthouse for runtime issues including contrast and names; and
— non-negotiable — manual keyboard-only navigation and a screen-reader pass
(VoiceOver/NVDA), because automation catches only ~50% of real problems (focus order,
meaningful announcements, and logical reading order need a human).

**7. Why are placeholders not labels?**
A placeholder disappears on input (so users lose context), often fails contrast, and
isn't reliably announced as the field's name by screen readers. Every field needs a
persistent programmatic label — a visible `<label htmlFor>` or, when there's genuinely
no visible label, an `aria-label`/`aria-labelledby`. Placeholders are at most a
supplementary hint.

---

## Interview Soundbites (tie to your NBA.com / JPMC work)
- *"Accessibility is structural, not a bolt-on — semantic HTML and landmarks first,
  then labelled controls, keyboard operability with visible focus and a skip link, AA
  contrast verified by the numbers, and ARIA only to fill native gaps."*
- *"I caught opacity-based muted text failing AA at 3.95:1 — fixed it to 5.74:1. You
  measure contrast, you don't eyeball it."*
- *"I enforce a11y in CI with the full jsx-a11y ruleset and axe in e2e, but I still do
  a keyboard and VoiceOver pass every release, because automation only catches about
  half — focus order and announcements need a human."*
- *"Building on Radix/shadcn means modals get focus trapping and forms get aria wiring
  for free, so accessibility is inherited by every page instead of re-done each time."*
