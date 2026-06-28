import { describe, it, expect } from "vitest";
import { readUtmParams } from "@/lib/utm";

describe("readUtmParams", () => {
  it("extracts utm_* from URLSearchParams", () => {
    const sp = new URLSearchParams("utm_source=newsletter&utm_campaign=spring&foo=bar");
    expect(readUtmParams(sp)).toEqual({
      utm_source: "newsletter",
      utm_campaign: "spring",
    });
  });

  it("extracts utm_* from a searchParams record (string | string[])", () => {
    expect(readUtmParams({ utm_source: ["linkedin"], utm_medium: "social" })).toEqual({
      utm_source: "linkedin",
      utm_medium: "social",
    });
  });

  it("returns an empty object when no utm params are present", () => {
    expect(readUtmParams(new URLSearchParams("a=1"))).toEqual({});
  });
});
