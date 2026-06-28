import { describe, it, expect } from "vitest";
import { blockSchema, landingPageSchema } from "@/lib/cms/schema";

describe("cms schema (runtime validation)", () => {
  it("accepts a valid cta block", () => {
    const r = blockSchema.safeParse({
      type: "cta",
      id: "c1",
      text: "Go",
      href: "/x",
      variant: "primary",
    });
    expect(r.success).toBe(true);
  });

  it("rejects an invalid enum variant", () => {
    const r = blockSchema.safeParse({
      type: "cta",
      id: "c1",
      text: "Go",
      href: "/x",
      variant: "tertiary",
    });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown block type", () => {
    expect(blockSchema.safeParse({ type: "carousel", id: "z" }).success).toBe(false);
  });

  it("rejects a landing page missing a required field", () => {
    expect(landingPageSchema.safeParse({ slug: "x", blocks: [] }).success).toBe(false);
  });
});
