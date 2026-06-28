import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  // Day 9: serve modern image formats first (smaller than JPEG/PNG → better LCP).
  // next/image negotiates AVIF → WebP → original based on the browser's Accept header.
  images: {
    formats: ["image/avif", "image/webp"],
    // Day 11: allow optimizing Contentful-hosted assets (images.ctfassets.net).
    remotePatterns: [{ protocol: "https", hostname: "images.ctfassets.net" }],
  },

  // Day 2: opt into the modern Next 16 caching model.
  // With Cache Components, Partial Prerendering (PPR) becomes the default:
  // each route is a static shell with dynamic "holes" that stream at request time.
  // `use cache` + cacheLife/cacheTag become the caching primitives.
  cacheComponents: true,

  // Day 4: enable the React Compiler (stable in Next 16, React Compiler 1.0).
  // It auto-memoizes components/values at build time, so we don't hand-write
  // useMemo/useCallback/React.memo. Runs via a Babel plugin
  // (babel-plugin-react-compiler), so builds are a bit slower in exchange.
  reactCompiler: true,
};

// Day 9: bundle analyzer — run `ANALYZE=true npm run build` to emit a treemap of
// the client/server bundles so you can see what's shipping JS and where to split.
const withAnalyzer = withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

export default withAnalyzer(nextConfig);
