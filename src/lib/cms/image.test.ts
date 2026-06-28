import { describe, it, expect } from "vitest";
import { contentfulLoader, ctfImageUrl } from "@/lib/cms/image";

const SRC = "https://images.ctfassets.net/x/y/hero.jpg";

describe("contentful image transforms", () => {
  it("loader builds a sized, AVIF, filled URL", () => {
    const url = new URL(contentfulLoader({ src: SRC, width: 800, quality: 70 }));
    expect(url.searchParams.get("w")).toBe("800");
    expect(url.searchParams.get("q")).toBe("70");
    expect(url.searchParams.get("fm")).toBe("avif");
    expect(url.searchParams.get("fit")).toBe("fill");
  });

  it("loader defaults quality to 75", () => {
    const url = new URL(contentfulLoader({ src: SRC, width: 400 }));
    expect(url.searchParams.get("q")).toBe("75");
  });

  it("helper honors explicit width/height/format", () => {
    const url = new URL(ctfImageUrl(SRC, { w: 1200, h: 630, fm: "webp" }));
    expect(url.searchParams.get("w")).toBe("1200");
    expect(url.searchParams.get("h")).toBe("630");
    expect(url.searchParams.get("fm")).toBe("webp");
  });
});
