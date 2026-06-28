# Contentful setup — `nr-next-marketing` (Day 11, live)

This folder makes the `/landing` page render from a **real Contentful space** instead
of the built-in fixture. It documents exactly what we did and how to reproduce it.

- **Import file:** [`space-import.json`](space-import.json) — the content model (6 types)
  + the `ship-faster` landing entry, mirroring `src/lib/cms/fixtures.ts`.
- **Helper script:** [`setup.mjs`](setup.mjs) — activates content types, publishes
  entries, creates API keys, and verifies the GraphQL query (idempotent; handles the
  free-tier rate-limit gotcha below).
- **App code it feeds:** `src/lib/cms/contentful.ts` (GraphQL query + mapping),
  `src/lib/cms/schema.ts` (zod validation), `src/app/(marketing)/landing/page.tsx`.

> **Secrets:** the Delivery/Preview tokens are **not** stored in this folder. They live
> in the gitignored `.env.local` (local) and in Vercel env vars (prod). Re-print them
> any time with `node contentful/setup.mjs <SPACE_ID>`.

---

## The content model (must match the app's GraphQL query)

Contentful derives GraphQL type names from each content type's **API Identifier**, so
these IDs must be exact — they map 1:1 to the inline fragments in `contentful.ts`.

| Content type (API ID) | GraphQL type | Fields |
|---|---|---|
| `landingPage` | `LandingPage` | `slug` (Symbol, unique), `title` (Symbol), `blocks` → **References, many** (Hero/FeatureList/RichText/Cta) |
| `heroBlock` | `HeroBlock` | `heading`, `subheading?`, `ctaLabel?`, `ctaHref?` (Symbol) |
| `featureListBlock` | `FeatureListBlock` | `title` (Symbol), `items` → **References, many** (`featureItem`) |
| `featureItem` | `FeatureItem` | `name` (Symbol), `description` (Text) |
| `richTextBlock` | `RichTextBlock` | `body` (**Symbol — plain text, NOT a Contentful "Rich text" field**) |
| `ctaBlock` | `CtaBlock` | `text` (Symbol), `href` (Symbol), `variant` (Symbol, in `primary`\|`secondary`) |

One **Landing Page** entry with slug **`ship-faster`** (the slug hard-coded in
`getLandingPage()`) links 4 blocks: Hero → FeatureList (3 items) → RichText → CTA.

---

## Reproduce from scratch

### Prerequisites
```bash
npm install -g contentful-cli
contentful login          # OAuth in browser; stores a management token in ~/.contentfulrc.json
```
Get your **Space ID** from the dashboard URL (`app.contentful.com/spaces/<SPACE_ID>/…`)
or **Settings → General**. (A free signup auto-creates a space — no need to make one.)

### 1. Import the content model + entry
```bash
contentful space import --space-id <SPACE_ID> --content-file contentful/space-import.json
```

> ⚠️ **Free-tier rate-limit gotcha (we hit this).** On the first run the import created
> all 6 content types but **rate limiting interrupted their activation**, so they stayed
> in **Draft**. Entry creation then failed for all 8 entries with:
> `BadRequest 400 — The content type you sent could not be found or was not activated.`
> The content model was fine; the types just weren't published yet.

### 2. Activate types, publish entries, get tokens, verify — one command
```bash
node contentful/setup.mjs <SPACE_ID>
```
This (idempotently, with delays for the rate limit):
1. **Activates** all 6 content types.
2. **Publishes** all 8 entries leaf-first (so links resolve on the Delivery API).
3. Creates/【reuses】 a **"Pace app" API key** and prints `CONTENTFUL_*` vars.
4. **Verifies** the app's exact GraphQL query (Delivery + Preview) returns the page
   with all 4 typed blocks.

If step 1 of the import ever fully succeeds on its own, `setup.mjs` is still safe to run
— it no-ops anything already active/published.

Expected tail:
```
4) Verifying the app's GraphQL query…
   DELIVERY ✅ "Ship marketing pages faster" — HeroBlock, FeatureListBlock, RichTextBlock, CtaBlock
   PREVIEW  ✅ "Ship marketing pages faster" — HeroBlock, FeatureListBlock, RichTextBlock, CtaBlock
```

### 3. Test locally (before touching prod)
Create `.env.local` (gitignored) with the 4 values `setup.mjs` printed:
```bash
CONTENTFUL_SPACE_ID=<SPACE_ID>
CONTENTFUL_ENVIRONMENT=master
CONTENTFUL_DELIVERY_TOKEN=<delivery token>
CONTENTFUL_PREVIEW_TOKEN=<preview token>
REVALIDATE_SECRET=dev-secret
```
```bash
npm run dev
curl -s http://localhost:3000/landing | grep -oE '<h1[^>]*>[^<]+</h1>' | head -1
```
The app falls back to the fixture only when `CONTENTFUL_SPACE_ID`/`DELIVERY_TOKEN` are
unset (see `queryContentful()`), so seeing your Contentful content here proves the wiring.

> 💡 **Proving live vs fixture:** the fixture and the imported entry are identical by
> design, so to *prove* the app reads Contentful, briefly edit the entry's title in
> Contentful (e.g. append " ✦") and re-`curl` — the marker appears only if it's live.

### 4. Set the env vars in Vercel + redeploy
Add the same 4 `CONTENTFUL_*` vars in **Vercel → Settings → Environment Variables**
(scope **Production + Preview**), then **redeploy** (Deployments → ⋯ → Redeploy, or push
a commit). Production `/landing` now renders from Contentful.

### 5. Publish webhook → instant updates (the payoff)
`getLandingPage()` is `use cache` + `cacheTag("cms")`. To make a Contentful **Publish**
refresh the live page in seconds (no redeploy), add a webhook:

- Contentful → **Settings → Webhooks → Add Webhook**
- **URL:** `https://nr-next-marketing.vercel.app/api/revalidate?secret=<REVALIDATE_SECRET>&tag=cms`
- **Triggers:** Entry → Publish & Unpublish (and Asset if you use images)
- Method `POST`. Use the **same `REVALIDATE_SECRET`** set in Vercel.

Then: edit an entry → Publish → the next `/landing` request shows the change (the
webhook calls `revalidateTag("cms", "max")`). Verify with the cache headers going
`HIT → STALE` (see `docs/feature_tour.md`, Station 4).

---

## Draft Mode (preview unpublished content)

`getLandingPage()` reads `draftMode().isEnabled` (allowed inside `use cache`) and queries
the **Preview API** when on. To see drafts:

```
/api/preview?secret=<REVALIDATE_SECRET>&redirect=/landing   → enables Draft Mode + banner
```
Make an unpublished change in Contentful → it shows only in preview. Click **Exit
preview** (a plain `<a>`, hard nav — see the fix in `docs/feature_tour.md`) to leave.

---

## Files in this folder
| File | Purpose |
|---|---|
| `space-import.json` | `contentful-import` payload: 6 content types + 8 entries (mirrors the fixture). |
| `setup.mjs` | Post-import helper: activate types, publish entries, create keys, verify GraphQL. |
| `README.md` | This guide. |

## Troubleshooting
| Symptom | Cause / fix |
|---|---|
| `content type … could not be found or was not activated` | Types created but not published. Run `node contentful/setup.mjs <SPACE_ID>`. |
| `/landing` shows fixture content in prod | `CONTENTFUL_SPACE_ID`/`DELIVERY_TOKEN` missing in Vercel, or not redeployed. |
| Edits don't appear live | No publish webhook, or wrong `secret`/`tag=cms`; or wait out `cacheLife("hours")`. |
| `Rate limit error … retrying` | Free-tier limit; `setup.mjs` already paces calls (700ms). Safe to re-run. |
| GraphQL `UNKNOWN_FIELD`/type errors | A content type API ID or field id doesn't match `contentful.ts`. Compare to the table above. |
