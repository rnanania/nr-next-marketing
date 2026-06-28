// Blog index → "/blog". Server Component that lists posts and links to each.

import Link from "next/link";
import { getPosts } from "@/lib/posts";

export const metadata = {
  title: "Blog — Acme",
  description: "Notes on building marketing sites with Next.js.",
};

export default async function BlogIndexPage() {
  const posts = await getPosts();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Blog</h1>
      <ul className="space-y-4">
        {posts.map((post) => (
          <li key={post.slug} className="border-b border-black/10 pb-4 dark:border-white/15">
            <Link href={`/blog/${post.slug}`} prefetch className="text-lg font-medium hover:underline">
              {post.title}
            </Link>
            <p className="text-sm text-black/60 dark:text-white/60">{post.date}</p>
            <p className="mt-1 text-black/70 dark:text-white/70">{post.excerpt}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
