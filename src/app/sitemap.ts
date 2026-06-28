import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { getPosts } from "@/lib/posts";

// Day 10: sitemap.ts is a special file → /sitemap.xml. It tells crawlers every
// indexable URL with freshness/priority hints. Static routes + CMS slugs are
// generated programmatically so new content is discoverable without hand-editing.
// (Cached by default since it reads only cached data — no request-time APIs.)
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;

  const staticRoutes = [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "/pricing", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/showcase", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/features", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/landing", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/blog", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/about", priority: 0.5, changeFrequency: "yearly" as const },
  ].map((r) => ({
    url: `${base}${r.path}`,
    lastModified: new Date(),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const posts = await getPosts();
  const blogRoutes = posts.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...blogRoutes];
}
