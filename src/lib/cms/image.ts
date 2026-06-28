import type { ImageLoaderProps } from "next/image";

// Day 11: Contentful's Images API does on-the-fly transforms via query params
// (?w=&h=&q=&fm=&fit=). This custom next/image loader hands the right-sized,
// modern-format URL to <Image loader={contentfulLoader} src={asset.url} …>, so
// the CMS does the resizing/format work at the edge — small bytes, good LCP (Day 9).
export function contentfulLoader({ src, width, quality }: ImageLoaderProps): string {
  const url = new URL(src);
  url.searchParams.set("w", String(width));
  url.searchParams.set("q", String(quality ?? 75));
  url.searchParams.set("fm", "avif"); // serve AVIF (falls back per Accept)
  url.searchParams.set("fit", "fill");
  return url.toString();
}

// Plain helper for non-<Image> uses (og images, emails, etc.).
export function ctfImageUrl(
  src: string,
  opts: { w?: number; h?: number; q?: number; fm?: "avif" | "webp" | "jpg" } = {},
): string {
  const url = new URL(src);
  if (opts.w) url.searchParams.set("w", String(opts.w));
  if (opts.h) url.searchParams.set("h", String(opts.h));
  url.searchParams.set("q", String(opts.q ?? 75));
  url.searchParams.set("fm", opts.fm ?? "avif");
  return url.toString();
}
