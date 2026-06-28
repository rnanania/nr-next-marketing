# Day 5 — TypeScript for React/Next (TS 5.9, eye on TS 7 native)

> Target: TypeScript **5.9**, React **19.2**, Next **16.2**. Builds on the Day 1–4
> project (`nr-next-marketing/`). Theme: **type-safe end to end** — model CMS
> content once, validate untrusted data at the boundary, and let the compiler
> enforce completeness. Direct prep for Day 11 (Contentful).

## Recap
| Topic | One-liner |
|---|---|
| **Generics** | Functions/types parameterized by a type (`<T>`) so they work for many shapes without `any`. |
| **Utility types** | Built-in transforms: `Partial`, `Required`, `Pick`, `Omit`, `Record`, `Readonly`, `Awaited`, `ReturnType`. |
| **`as const`** | Freezes a literal to its narrowest type (readonly, literal members) — turns `string` into `"primary"`. |
| **`satisfies`** | Check a value matches a type **without widening** it — keep the precise literal types *and* get checking. |
| **Narrowing** | Letting TS refine a union via checks (`typeof`, `in`, `===`, truthiness, discriminant). |
| **Discriminated union** | A union of object types sharing a literal "tag" field (`type`) — the safest way to model variants. |
| **Exhaustiveness (`never`)** | A `default: assertNever(x)` makes the compiler fail if a union member is unhandled. |
| **`z.infer`** | Derive the TS type **from** a zod schema — one source of truth for runtime + compile-time. |
| **TS 7 (`tsgo`)** | Native Go rewrite of the compiler — same semantics, much faster typecheck/builds. |

### Abbreviations
| Short | Full form |
|---|---|
| **DU** | Discriminated Union |
| **SoT** | Source of Truth |
| **CMS** | Content Management System |
| **DTO** | Data Transfer Object (the shape crossing a boundary) |
| **`tsgo`** | The TypeScript 7 native (Go) compiler binary |

---

## 1. Generics — reusable, type-preserving code

A generic ties an input type to an output type so you don't lose information to `any`.

```ts
// The validate wrapper: the return type is whatever the schema describes.
function validate<S extends z.ZodType>(schema: S, data: unknown): z.infer<S> { … }

const page = validate(landingPageSchema, raw); // page: LandingPage — inferred, no cast
```

`<S extends z.ZodType>` constrains the parameter (must be a zod schema) and
`z.infer<S>` *computes* the result type from it. One generic function, correct types
for every schema you pass.

---

## 2. Utility types, `as const`, `satisfies`

```ts
type Block = …;                       // the DU (below)
type BlockType = Block["type"];       // indexed access → "hero" | "featureList" | …
type BlockSummary = Pick<Block, "type" | "id">;        // a narrow view
type Labels = Record<BlockType, string>;               // every type → a label

// `as const satisfies` — keep the exact literal values AND verify completeness:
const BLOCK_LABELS = {
  hero: "Hero", featureList: "Feature list", cta: "Call to action", richText: "Rich text",
} as const satisfies Labels;   // miss a key → error; values stay literal types
```

Quick reference:
| Utility | Does |
|---|---|
| `Partial<T>` | all props optional (drafts/patches) |
| `Required<T>` | all props required |
| `Pick<T, K>` / `Omit<T, K>` | keep / drop named props |
| `Record<K, V>` | object with keys `K`, values `V` (maps, registries) |
| `Readonly<T>` | immutable props |
| `ReturnType<F>` / `Awaited<T>` | a function's return / a promise's resolved type |

**`as const` vs `satisfies`:** `as const` narrows & freezes; `satisfies` checks
against a type *without widening*. Use them together to get literal types **and**
a compile-time guarantee the object is complete/correct.

---

## 3. Narrowing & discriminated unions (the core pattern)

A **discriminated union** models "one of N shapes" with a shared literal tag:

```ts
type Block =
  | { type: "hero";        id: string; heading: string; /*…*/ }
  | { type: "featureList"; id: string; items: {…}[] }
  | { type: "cta";         id: string; variant: "primary" | "secondary" }
  | { type: "richText";    id: string; body: string };
```

Switching on the tag **narrows** each branch, and a `never` default enforces
exhaustiveness — add a member to the union and forget a case → **compile error**:

```tsx
function Section({ block }: { block: Block }) {
  switch (block.type) {
    case "hero":        return <Hero {...block} />;        // block: hero member
    case "featureList": return <FeatureList {...block} />;
    case "cta":         return <Cta {...block} />;
    case "richText":    return <RichText {...block} />;
    default:            return assertNever(block);          // block: never
  }
}
function assertNever(x: never): never { throw new Error(`Unhandled: ${x}`); }
```

Each block component types its props by **extracting** its member — no re-typing:

```ts
type HeroProps = Extract<Block, { type: "hero" }>;
```

---

## 4. Typing React: props, children, events, hooks, API shapes

```ts
// children + DOM-like props: reuse React's own prop types
function TextInput(props: React.ComponentProps<"input">) { return <input {...props} /> }
type CardProps = { title: string; children: React.ReactNode };

// events: let React infer, or name the type
const onChange = (e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value);

// hooks: annotate the state type when it can't be inferred from the initial value
const [page, setPage] = useState<LandingPage | null>(null);
const ref = useRef<HTMLInputElement>(null);

// API/CMS responses: type the DTO, but VALIDATE it (you don't control the server)
```

Rule: **annotate boundaries, infer interiors.** Type function params, public
returns, props, and external payloads; let TS infer local variables.

---

## 5. zod — runtime validation as the single source of truth

TypeScript types are **erased at runtime** — they can't protect you from a CMS that
sends the wrong shape. zod gives you a schema that validates at runtime *and* an
inferred static type, so the two can never drift:

```ts
const ctaBlock = z.object({
  type: z.literal("cta"), id: z.string(),
  text: z.string(), href: z.string(), variant: z.enum(["primary", "secondary"]),
});
export const blockSchema = z.discriminatedUnion("type", [hero, featureList, cta, richText]);
export type Block = z.infer<typeof blockSchema>;   // type DERIVED from schema
```

Parse untrusted data at the edge, then trust the type everywhere inside:

```ts
const RAW: unknown = await fetchFromCMS();     // no compile-time guarantees
const page = validate(landingPageSchema, RAW); // throws on bad data → typed after
```

`z.discriminatedUnion` even mirrors the TS DU: zod reads the `type` literal to pick
the right member and rejects unknown tags. **This is "type-safe end to end."**

---

## 6. TypeScript 7 — the native (`tsgo`) compiler

TS 7 is a **Go rewrite** of the compiler/language service — **same type system and
semantics**, dramatically faster typecheck and editor responsiveness (the team
targets ~10× on large codebases). Learn and ship on 5.x; try `tsgo` in CI now:

```bash
npm i -D @typescript/native-preview
npx tsgo --noEmit          # same errors as tsc, faster
```

Migration story: zero code changes — it's the same `tsconfig`, same diagnostics. You
adopt it for **speed** (CI gates, big monorepos, editor latency), not new features.

---

## Build Exercise — ✅ BUILT & RUNNING

Added to the Day 1–4 project (`nr-next-marketing/`):

| Concept | Where |
|---|---|
| **zod schema = SoT**, `z.infer` types, DU of blocks | `src/lib/cms/schema.ts` |
| **Generic `validate<S>()`** + boundary parsing + cached loader | `src/lib/cms/content.ts` |
| **Block components typed via `Extract`** | `src/components/blocks/{hero,feature-list,cta,rich-text}.tsx` |
| **Exhaustive `<Section>` renderer** (`never`/`assertNever`) | `src/components/block-renderer.tsx` |
| **CMS-driven page** from validated content | `src/app/(marketing)/landing/page.tsx` |
| Utility types (`Pick`/`Record`), `as const satisfies` | `src/lib/cms/schema.ts` |

Run it:
```bash
cd nr-next-marketing
npm run dev                 # http://localhost:3000/landing
npx tsc --noEmit            # classic typecheck (clean)
npx tsgo --noEmit           # TS 7 native typecheck (clean, faster)
```

---

## Hands-On Walkthrough — Day 5 Concepts Proven in This Project

### A. The exhaustiveness check is a real safety net
Temporarily adding a 5th block (`banner`) to the union **without** a renderer case
fails the build at the `never` default:
```
$ npx tsc --noEmit
src/components/block-renderer.tsx(29,26): error TS2345:
  Argument of type '{ type: "banner"; id: string; text: string; }'
  is not assignable to parameter of type 'never'.
```
**What this proves:** the discriminated union + `assertNever` make it *impossible* to
add a content type and forget to render it — the compiler forces completeness.

### B. zod rejects bad data at the boundary
Running the schema against good and bad payloads:
```
valid cta block parses:      true
invalid variant rejected:    true   (variant "tertiary" not in enum)
unknown block type rejected: true   (type "carousel" not in the union)
page missing title rejected: true
```
**What this proves:** untrusted CMS/API data is validated at runtime — the inferred
TS type is only trusted *after* a successful parse, closing the gap that erased types
leave open.

### C. tsc and tsgo agree — tsgo is faster
```
classic tsc (5.9.3):  exit 0   (~2.24s CPU)
TS 7 native tsgo:     exit 0   (~0.63s CPU)
```
**What this proves:** the native compiler produces the **same result** (clean
typecheck, exit 0) with much less work — even on this small project (the gap widens
on large codebases). Same semantics, drop-in, faster CI.

### D. The typed model renders end to end
`/landing` loads the validated content and renders every block via one resolver:
```
status=200
hero heading   : 1   ("Launch campaigns in minutes")
featureList    : 1   ("Why teams choose Acme")
cta block      : 1   ("Start free")
richText block : 1   ("Trusted by teams shipping…")
```
**What this proves:** a single `<BlockRenderer>` turns validated, typed content into
UI — the marketer-editable page-builder pattern, type-safe from CMS payload to DOM.

### Try-it-yourself experiments
1. **Break exhaustiveness:** add a block variant to `blockSchema` and run
   `npx tsc --noEmit` → error in `block-renderer.tsx`. Add the case → clean.
2. **Break the data, not the types:** change a `RAW_LANDING` block's `variant` to
   `"tertiary"` in `content.ts` → the page throws "Invalid landing page" from
   `validate()` (caught nicely if you add an `error.tsx`), even though TS compiled.
3. **Feel `as const satisfies`:** remove a key from `BLOCK_LABELS` → compile error
   (missing key); change `as const satisfies` to just `satisfies` and hover a value —
   it widens to `string` instead of the literal.
4. **Run the native compiler:** `npx tsgo --noEmit` and compare wall-time to
   `npx tsc --noEmit`.

---

## Self-Check Questions & Answers

**1. How do you keep CMS data type-safe end to end?**
Define the content model **once** as a zod schema and infer the TypeScript type from
it (`z.infer`) — one source of truth so runtime and compile-time can't drift. At the
fetch boundary, `parse`/`safeParse` the untrusted payload; only after a successful
parse do you trust the inferred type. Model variant content as a **discriminated
union** and render it through an **exhaustive** resolver so adding a content type
forces a renderer update. Net: invalid data is caught at the edge, and the compiler
enforces completeness everywhere inside.

**2. What's a discriminated union and why prefer it?**
A union of object types sharing a literal tag field (here `type`). TypeScript narrows
each branch by the tag, so member-specific fields are safely accessible, and a `never`
default gives compile-time exhaustiveness. It beats optional-field "bag of maybes"
objects (no `block.heading!` non-null assertions) and makes illegal states
unrepresentable.

**3. `as const` vs `satisfies` — when each?**
`as const` narrows a literal to its most specific, readonly type (`"primary"` not
`string`; tuples not arrays) — use it for constant config/enums-as-objects.
`satisfies` checks a value against a type **without widening** it — use it to verify
an object is complete/correct while keeping precise inferred types. Combined
(`as const satisfies T`) you get literal types *and* a completeness guarantee.

**4. Why isn't TypeScript enough for API/CMS data, and what do you add?**
TS types are erased at runtime — they describe what you *expect*, not what actually
arrives. A server can send anything. So you add **runtime validation** (zod) at the
boundary: a schema that both checks the data and yields the static type via `z.infer`.
Parse first, then the rest of the app can trust the type.

**5. When do you annotate vs let TypeScript infer?**
Annotate **boundaries**: function parameters, public return types, component props,
and external payloads (DTOs). Infer **interiors**: local variables, obvious returns,
state initialized from a concrete value. Over-annotating interiors adds noise and can
fight inference; under-annotating boundaries hides bugs and worsens errors.

**6. How do you type React props, children, events, and refs?**
Props: an object type or `React.ComponentProps<'input'>` to reuse DOM prop types;
children via `React.ReactNode`. Events: `React.ChangeEvent<HTMLInputElement>` etc., or
let the inline handler infer. Refs: `useRef<HTMLInputElement>(null)`. State: annotate
when the initial value can't express the full type (`useState<T | null>(null)`). In
React 19, `ref` is a normal prop — no `forwardRef` generic gymnastics.

**7. What is the TypeScript 7 native compiler and why care?**
TS 7 (`tsgo`) is a Go rewrite of the compiler and language service with the **same
type system and diagnostics** — the win is **speed** (typecheck/builds and editor
responsiveness, ~10× on large projects). It's a drop-in for CI/editor: same
`tsconfig`, same errors, no code changes. Learn on 5.x; try `tsgo` in CI for faster gates.

---

## Interview Soundbites (tie to your NBA.com / JPMC work)
- *"I make the CMS schema the single source of truth — a zod schema that validates the
  payload at the boundary and infers the TypeScript type, so runtime and compile-time
  can't drift. That's how you keep Contentful data type-safe end to end."*
- *"Variant content is a discriminated union rendered through an exhaustive resolver —
  add a block type and the compiler won't let you forget to render it."*
- *"TS types are erased at runtime, so for anything I don't control — APIs, CMS — I
  parse with zod first and trust the type only after. Types describe intent;
  validation enforces reality."*
- *"TS 7's native compiler is a drop-in speed upgrade — same semantics, much faster CI
  typecheck — so I'd wire `tsgo --noEmit` into the pipeline while still shipping on 5.x."*
