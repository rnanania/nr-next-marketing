#!/usr/bin/env node
// Contentful setup helper for nr-next-marketing (Day 11).
//
// Automates the Content Management API (CMA) steps that `contentful space import`
// can leave half-done on the free tier (rate limiting interrupts content-type
// activation + leaves entries unpublished). Run AFTER `contentful space import`.
//
// What it does (idempotent, with delays to respect the free-tier rate limit):
//   1. Activate (publish) all content types.
//   2. Publish all entries, leaf-first so links resolve on the Delivery API.
//   3. Create (or reuse) a "Pace app" API key and print the Delivery + Preview tokens.
//   4. Verify the app's exact GraphQL query against the live space.
//
// Auth: reads the management token from ~/.contentfulrc.json (written by
// `contentful login`) or from $CONTENTFUL_MANAGEMENT_TOKEN.
//
// Usage:
//   node contentful/setup.mjs <SPACE_ID> [ENVIRONMENT=master]
//   node contentful/setup.mjs xfddalbzn1en

import { readFileSync } from "node:fs";
import { homedir } from "node:os";

const SPACE = process.argv[2];
const ENV = process.argv[3] || "master";
if (!SPACE) {
  console.error("Usage: node contentful/setup.mjs <SPACE_ID> [ENVIRONMENT=master]");
  process.exit(1);
}

const TOKEN =
  process.env.CONTENTFUL_MANAGEMENT_TOKEN ||
  (() => {
    try {
      const c = JSON.parse(readFileSync(`${homedir()}/.contentfulrc.json`, "utf8"));
      return c.managementToken || c.cmaToken || "";
    } catch {
      return "";
    }
  })();
if (!TOKEN) {
  console.error("No management token. Run `contentful login` or set CONTENTFUL_MANAGEMENT_TOKEN.");
  process.exit(1);
}

const CMA = `https://api.contentful.com/spaces/${SPACE}/environments/${ENV}`;
const CMA_SPACE = `https://api.contentful.com/spaces/${SPACE}`;
const H = { Authorization: `Bearer ${TOKEN}` };
const HW = { ...H, "Content-Type": "application/vnd.contentful.management.v1+json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RATE_MS = 700; // stay under the free-tier write rate limit

// Publish entries leaf-first so the Delivery API can resolve links immediately.
const ENTRY_ORDER = [
  "fitem-fast", "fitem-fresh", "fitem-typesafe",
  "hero-1", "rich-1", "cta-1", "flist-1", "landing-ship-faster",
];

async function activateContentTypes() {
  console.log("\n1) Activating content types…");
  const list = await (await fetch(`${CMA}/content_types`, { headers: H })).json();
  for (const ct of list.items) {
    if (ct.sys.publishedVersion) { console.log(`   ${ct.sys.id} — already active`); continue; }
    const res = await fetch(`${CMA}/content_types/${ct.sys.id}/published`, {
      method: "PUT", headers: { ...H, "X-Contentful-Version": String(ct.sys.version) },
    });
    console.log(`   ${ct.sys.id} — ${res.ok ? "✅ activated" : "❌ " + res.status}`);
    await sleep(RATE_MS);
  }
}

async function publishEntries() {
  console.log("\n2) Publishing entries…");
  for (const id of ENTRY_ORDER) {
    const e = await (await fetch(`${CMA}/entries/${id}`, { headers: H })).json();
    if (!e.sys) { console.log(`   ${id} — ❌ not found (did the import run?)`); continue; }
    if (e.sys.publishedVersion && e.sys.publishedVersion + 1 === e.sys.version) {
      console.log(`   ${id} — already published`); continue;
    }
    const res = await fetch(`${CMA}/entries/${id}/published`, {
      method: "PUT", headers: { ...H, "X-Contentful-Version": String(e.sys.version) },
    });
    console.log(`   ${id.padEnd(22)} ${res.ok ? "✅ published" : "❌ " + res.status}`);
    await sleep(RATE_MS);
  }
}

async function ensureApiKey() {
  console.log("\n3) Delivery + Preview API keys…");
  let keys = await (await fetch(`${CMA_SPACE}/api_keys`, { headers: H })).json();
  let key = (keys.items || []).find((k) => k.name === "Pace app");
  if (!key) {
    const res = await fetch(`${CMA_SPACE}/api_keys`, {
      method: "POST", headers: HW,
      body: JSON.stringify({
        name: "Pace app",
        environments: [{ sys: { type: "Link", linkType: "Environment", id: ENV } }],
      }),
    });
    key = await res.json();
    if (!res.ok) { console.log("   ❌ create failed:", JSON.stringify(key).slice(0, 160)); return null; }
  }
  const delivery = key.accessToken;
  const pk = await (await fetch(`${CMA_SPACE}/preview_api_keys/${key.preview_api_key.sys.id}`, { headers: H })).json();
  const preview = pk.accessToken;
  console.log(`   CONTENTFUL_SPACE_ID     = ${SPACE}`);
  console.log(`   CONTENTFUL_ENVIRONMENT  = ${ENV}`);
  console.log(`   CONTENTFUL_DELIVERY_TOKEN = ${delivery}`);
  console.log(`   CONTENTFUL_PREVIEW_TOKEN  = ${preview}`);
  return { delivery, preview };
}

const LANDING_QUERY = `query LandingPage($slug: String!, $preview: Boolean!) {
  landingPageCollection(where: { slug: $slug }, preview: $preview, limit: 1) {
    items { slug title
      blocksCollection(limit: 25) { items {
        __typename
        ... on HeroBlock { sys { id } heading subheading ctaLabel ctaHref }
        ... on FeatureListBlock { sys { id } title itemsCollection { items { name description } } }
        ... on RichTextBlock { sys { id } body }
        ... on CtaBlock { sys { id } text href variant }
      } }
    }
  }
}`;

async function verifyGraphql(tokens) {
  if (!tokens) return;
  console.log("\n4) Verifying the app's GraphQL query…");
  for (const [label, token, isPreview] of [
    ["DELIVERY", tokens.delivery, false],
    ["PREVIEW ", tokens.preview, true],
  ]) {
    const res = await fetch(`https://graphql.contentful.com/content/v1/spaces/${SPACE}/environments/${ENV}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: LANDING_QUERY, variables: { slug: "ship-faster", preview: isPreview } }),
    });
    const j = await res.json();
    if (j.errors) { console.log(`   ${label} ❌ ${JSON.stringify(j.errors).slice(0, 200)}`); continue; }
    const item = j.data.landingPageCollection.items[0];
    const blocks = item.blocksCollection.items.map((b) => b.__typename).join(", ");
    console.log(`   ${label} ✅ "${item.title}" — ${blocks}`);
  }
}

(async () => {
  await activateContentTypes();
  await publishEntries();
  const tokens = await ensureApiKey();
  await verifyGraphql(tokens);
  console.log("\nDone. Put the 4 vars above into .env.local (local) and Vercel (prod).");
})();
