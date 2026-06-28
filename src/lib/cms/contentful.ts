import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { draftMode } from "next/headers";
import { landingPageSchema, type Block, type LandingPage } from "./schema";
import { validate } from "./content";
import { LANDING_PUBLISHED, LANDING_DRAFT } from "./fixtures";

// Day 11: a realistic Contentful integration.
//
// - Delivery API (published) vs Preview API (drafts) chosen by a token + a flag.
// - Content fetched over Contentful's GraphQL endpoint, tagged "cms" so a publish
//   webhook can revalidate it (revalidateTag).
// - The raw Contentful entry shape is MAPPED to our internal block union, then
//   VALIDATED with zod — Contentful is untrusted input, so we parse at the boundary.
// - With no credentials, a local fixture mirroring the GraphQL shape is used, so
//   everything runs identically without a space.

const SPACE = process.env.CONTENTFUL_SPACE_ID;
const ENVIRONMENT = process.env.CONTENTFUL_ENVIRONMENT ?? "master";
const DELIVERY_TOKEN = process.env.CONTENTFUL_DELIVERY_TOKEN;
const PREVIEW_TOKEN = process.env.CONTENTFUL_PREVIEW_TOKEN;

// GraphQL query for a "landingPage" content type whose `blocks` field is a union.
const LANDING_QUERY = /* GraphQL */ `
  query LandingPage($slug: String!, $preview: Boolean!) {
    landingPageCollection(where: { slug: $slug }, preview: $preview, limit: 1) {
      items {
        slug
        title
        blocksCollection(limit: 25) {
          items {
            __typename
            ... on HeroBlock { sys { id } heading subheading ctaLabel ctaHref }
            ... on FeatureListBlock { sys { id } title itemsCollection { items { name description } } }
            ... on RichTextBlock { sys { id } body }
            ... on CtaBlock { sys { id } text href variant }
          }
        }
      }
    }
  }
`;

async function queryContentful(slug: string, preview: boolean): Promise<unknown> {
  // No space configured → use the local fixture (same shape as the real API).
  if (!SPACE || !DELIVERY_TOKEN) {
    return preview ? LANDING_DRAFT : LANDING_PUBLISHED;
  }

  const res = await fetch(
    `https://graphql.contentful.com/content/v1/spaces/${SPACE}/environments/${ENVIRONMENT}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Preview API requires the preview token; Delivery API the delivery token.
        Authorization: `Bearer ${preview ? PREVIEW_TOKEN : DELIVERY_TOKEN}`,
      },
      body: JSON.stringify({ query: LANDING_QUERY, variables: { slug, preview } }),
      next: { tags: ["cms"] },
    },
  );
  if (!res.ok) throw new Error(`Contentful responded ${res.status}`);
  return res.json();
}

// --- Mapping: Contentful entry shape → our internal Block union ---------------
// The CMS shape (·__typename·, ·sys.id·, nested ·...Collection·) is mapped to the
// flat, render-friendly block our <Section> resolver understands.

type CfBlock = { __typename: string; sys: { id: string } } & Record<string, unknown>;

function mapBlock(b: CfBlock): Block {
  switch (b.__typename) {
    case "HeroBlock":
      return {
        type: "hero",
        id: b.sys.id,
        heading: b.heading as string,
        subheading: (b.subheading as string) ?? undefined,
        ctaLabel: (b.ctaLabel as string) ?? undefined,
        ctaHref: (b.ctaHref as string) ?? undefined,
      };
    case "FeatureListBlock":
      return {
        type: "featureList",
        id: b.sys.id,
        title: b.title as string,
        items: (b.itemsCollection as { items: { name: string; description: string }[] }).items,
      };
    case "RichTextBlock":
      return { type: "richText", id: b.sys.id, body: b.body as string };
    case "CtaBlock":
      return {
        type: "cta",
        id: b.sys.id,
        text: b.text as string,
        href: b.href as string,
        variant: b.variant as "primary" | "secondary",
      };
    default:
      throw new Error(`Unknown Contentful block type: ${b.__typename}`);
  }
}

function mapLandingPage(raw: unknown): unknown {
  const item = (raw as {
    data?: { landingPageCollection?: { items?: unknown[] } };
  }).data?.landingPageCollection?.items?.[0] as
    | { slug: string; title: string; blocksCollection: { items: CfBlock[] } }
    | undefined;
  if (!item) throw new Error("Landing page not found in Contentful response");
  return { slug: item.slug, title: item.title, blocks: item.blocksCollection.items.map(mapBlock) };
}

// Draft-mode-aware loader. `draftMode().isEnabled` is readable inside `use cache`;
// when it's ON, Next re-executes this scope per request (no caching) so editors
// always see fresh draft content. When OFF, it's cached + tagged for revalidation.
export async function getLandingPage(): Promise<{ page: LandingPage; preview: boolean }> {
  "use cache";
  cacheLife("hours");
  cacheTag("cms");

  const { isEnabled: preview } = await draftMode();
  const raw = await queryContentful("ship-faster", preview);
  const page = validate(landingPageSchema, mapLandingPage(raw), preview ? "preview landing" : "landing");
  return { page, preview };
}
