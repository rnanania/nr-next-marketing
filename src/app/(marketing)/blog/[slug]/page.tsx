// Dynamic route → "/blog/:slug".
// Demonstrates the three Next 16 essentials:
//   1. async `params` (it's a Promise now — must await)
//   2. generateStaticParams → pre-render every known slug at build (SSG)
//   3. generateMetadata → per-page SEO from the data
//   4. notFound() for unknown slugs

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPost, getPosts } from "@/lib/posts";
import JsonLd from "@/components/json-ld";
import { siteConfig } from "@/lib/site";

// Pre-render all known slugs at build time.
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

// Per-page metadata (note: params is async here too). Includes a self-referencing
// CANONICAL (avoids duplicate-content issues) and article-specific Open Graph.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Not found", robots: { index: false } };

  const url = `/blog/${post.slug}`;
  return {
    title: `${post.title} — ${siteConfig.name}`,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url,
      publishedTime: post.date,
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.excerpt },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params; // ⚠️ must await in Next 15/16
  const post = await getPost(slug);

  if (!post) notFound();

  const postUrl = `${siteConfig.url}/blog/${post.slug}`;

  return (
    <article className="prose space-y-4">
      {/* Article structured data → eligible for rich results in search. */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt,
          datePublished: post.date,
          author: { "@type": "Organization", name: siteConfig.name },
          publisher: { "@type": "Organization", name: siteConfig.name },
          mainEntityOfPage: postUrl,
        }}
      />
      {/* Breadcrumb structured data → breadcrumb display in search results. */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Blog", item: `${siteConfig.url}/blog` },
            { "@type": "ListItem", position: 2, name: post.title, item: postUrl },
          ],
        }}
      />
      <Link href="/blog" className="text-sm text-brand-600 dark:text-brand-300 hover:underline">
        ← Back to blog
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
      <p className="text-sm text-black/60 dark:text-white/60">{post.date}</p>
      <p className="text-black/80 dark:text-white/80">{post.body}</p>
    </article>
  );
}
