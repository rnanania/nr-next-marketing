import { z } from "zod";

// Day 5: zod schemas are the SINGLE SOURCE OF TRUTH for the CMS content model.
//
// We define the shape once as a zod schema (runtime validation) and INFER the
// TypeScript type from it with z.infer. That means the static type and the
// runtime check can never drift apart — exactly what you want for untrusted
// CMS/API payloads (Day 11 Contentful). This is the type-safe-end-to-end story.

// A "page builder" content model: a page is an ordered list of typed blocks.
// Each block is a member of a DISCRIMINATED UNION keyed on `type`.

const heroBlock = z.object({
  type: z.literal("hero"),
  id: z.string(),
  heading: z.string(),
  subheading: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
});

const featureListBlock = z.object({
  type: z.literal("featureList"),
  id: z.string(),
  title: z.string(),
  items: z
    .array(z.object({ name: z.string(), description: z.string() }))
    .min(1),
});

const ctaBlock = z.object({
  type: z.literal("cta"),
  id: z.string(),
  text: z.string(),
  href: z.string(),
  variant: z.enum(["primary", "secondary"]),
});

const richTextBlock = z.object({
  type: z.literal("richText"),
  id: z.string(),
  // Kept as plain text for the demo; a real CMS sends rich-text JSON.
  body: z.string(),
});

// The discriminated union: zod uses the `type` literal to pick the right schema.
export const blockSchema = z.discriminatedUnion("type", [
  heroBlock,
  featureListBlock,
  ctaBlock,
  richTextBlock,
]);

export const landingPageSchema = z.object({
  slug: z.string(),
  title: z.string(),
  blocks: z.array(blockSchema),
});

// Inferred TypeScript types — derived from the schemas, never hand-written.
export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block["type"]; // "hero" | "featureList" | "cta" | "richText"
export type LandingPage = z.infer<typeof landingPageSchema>;

// Utility-type demos (covered in the Day 5 notes):
// Pick a narrow view of a block; Record maps each block type to something.
export type BlockSummary = Pick<Block, "type" | "id">;
export type BlockTypeLabels = Record<BlockType, string>;

export const BLOCK_LABELS = {
  hero: "Hero",
  featureList: "Feature list",
  cta: "Call to action",
  richText: "Rich text",
} as const satisfies BlockTypeLabels;
