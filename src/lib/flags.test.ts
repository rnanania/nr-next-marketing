import { describe, it, expect } from "vitest";
import { assignVariant, isVariant } from "@/lib/flags";

describe("flags", () => {
  it("isVariant guards A/B", () => {
    expect(isVariant("A")).toBe(true);
    expect(isVariant("B")).toBe(true);
    expect(isVariant("C")).toBe(false);
    expect(isVariant(undefined)).toBe(false);
  });

  it("assignVariant always returns a valid variant", () => {
    for (let i = 0; i < 50; i++) {
      expect(isVariant(assignVariant())).toBe(true);
    }
  });
});
