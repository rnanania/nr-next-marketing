import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

// Day 10: robots.ts → /robots.txt. Tells crawlers what they may fetch and points
// them at the sitemap. We block the API/proxy routes (no SEO value) and allow the
// rest. The sitemap reference is how crawlers discover all indexable URLs.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
