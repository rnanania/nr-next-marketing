// Day 10: one source of truth for SEO/site identity, reused by metadata,
// sitemap, robots, and JSON-LD so URLs and names never drift.

export const siteConfig = {
  name: "Pace",
  // In prod this is your canonical origin (env-driven). metadataBase below makes
  // every relative canonical/OG URL absolute against it.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://pace.example.com",
  description:
    "Ship high-performance, CMS-driven marketing pages fast with Next.js.",
  twitter: "@pace",
};

export const siteUrl = new URL(siteConfig.url);
