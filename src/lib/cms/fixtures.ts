// Day 11: local fixtures that MIRROR Contentful's GraphQL Content API response
// shape, so the mapping + validation layer (contentful.ts) is exercised exactly
// as it would be against a real space — the project runs with zero credentials.
//
// Real Contentful GraphQL returns collections of entries; a "block" union field
// comes back with `__typename` per member and `sys.id` for the entry id. Linked
// lists (a feature list's items) arrive as nested `...Collection { items }`.

type ContentfulResponse = { data: { landingPageCollection: { items: unknown[] } } };

function landing(titleSuffix = ""): ContentfulResponse {
  return {
    data: {
      landingPageCollection: {
        items: [
          {
            slug: "ship-faster",
            title: `Ship marketing pages faster${titleSuffix}`,
            blocksCollection: {
              items: [
                {
                  __typename: "HeroBlock",
                  sys: { id: "h1" },
                  heading: "Launch campaigns in minutes",
                  subheading: "A CMS-driven site marketers can edit without engineering.",
                  ctaLabel: "See pricing",
                  ctaHref: "/pricing",
                },
                {
                  __typename: "FeatureListBlock",
                  sys: { id: "f1" },
                  title: "Why teams choose Pace",
                  itemsCollection: {
                    items: [
                      { name: "Fast", description: "Static shell + edge caching keep it instant." },
                      { name: "Fresh", description: "Publish from the CMS with no redeploy." },
                      { name: "Type-safe", description: "Content validated end to end with zod." },
                    ],
                  },
                },
                {
                  __typename: "RichTextBlock",
                  sys: { id: "r1" },
                  body: "Trusted by teams shipping landing pages every week.",
                },
                {
                  __typename: "CtaBlock",
                  sys: { id: "c1" },
                  text: "Start free",
                  href: "/subscribe",
                  variant: "primary",
                },
              ],
            },
          },
        ],
      },
    },
  };
}

// Published (Delivery API) content.
export const LANDING_PUBLISHED = landing();

// Draft (Preview API) content — note the "(DRAFT)" title + an extra unpublished
// CTA block, so preview is visibly different from production.
export const LANDING_DRAFT: ContentfulResponse = (() => {
  const draft = landing(" (DRAFT)");
  const items = (draft.data.landingPageCollection.items[0] as {
    blocksCollection: { items: unknown[] };
  }).blocksCollection.items;
  items.splice(1, 0, {
    __typename: "RichTextBlock",
    sys: { id: "draft-note" },
    body: "🚧 This banner only exists in the draft — visible in preview, not in production.",
  });
  return draft;
})();
