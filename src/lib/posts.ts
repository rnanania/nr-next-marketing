// Tiny local "CMS" so we can practice dynamic routes + generateStaticParams
// without depending on a real backend yet (that comes on Day 11: Contentful).

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  date: string;
};

const posts: Post[] = [
  {
    slug: "why-nextjs-for-marketing-sites",
    title: "Why Next.js is great for marketing sites",
    excerpt: "Server rendering, SEO, and instant navigation in one framework.",
    body: "Next.js lets you render marketing pages on the server for SEO and speed, while keeping interactive bits as small client islands. ISR means marketers can publish without a redeploy.",
    date: "2026-06-01",
  },
  {
    slug: "server-vs-client-components",
    title: "Server vs Client Components, explained",
    excerpt: "The core mental model of the App Router.",
    body: "Components are Server Components by default. Add 'use client' only where you need state, effects, or event handlers. Push that boundary as far down the tree as possible.",
    date: "2026-06-03",
  },
  {
    slug: "core-web-vitals-basics",
    title: "Core Web Vitals basics",
    excerpt: "LCP, CLS, and INP — what they are and why they matter.",
    body: "Core Web Vitals measure loading (LCP), visual stability (CLS), and responsiveness (INP). Good scores improve both UX and SEO ranking.",
    date: "2026-06-05",
  },
];

import { cacheLife, cacheTag } from "next/cache";

// Simulate an async data source (like a CMS fetch).
// `use cache` caches the return value; cacheTag("posts") lets us invalidate it
// on-demand (see the revalidate Server Action on the blog page).
export async function getPosts(): Promise<Post[]> {
  "use cache";
  cacheLife("days");
  cacheTag("posts");
  return posts;
}

export async function getPost(slug: string): Promise<Post | undefined> {
  "use cache";
  cacheLife("days");
  cacheTag("posts");
  return posts.find((p) => p.slug === slug);
}
