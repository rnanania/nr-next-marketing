// HOME PAGE — a Server Component (the default; note it's `async`).
// It fetches data ON THE SERVER and ships zero fetch/JS to the browser for this.
// Lives in the (marketing) group, so its URL is just "/".

import Link from "next/link";
import Image from "next/image";
import { cacheLife } from "next/cache";
import { getPosts } from "@/lib/posts";
import hero from "@/images/hero.jpg";

export const metadata = {
  title: "Acme — Ship marketing pages fast",
  description: "A demo marketing site built with the Next.js 16 App Router.",
};

// Demo of fetching from a real third-party API on the server.
// `use cache` + cacheLife("hours") caches the result so this page can be fully
// prerendered into the static shell (revalidated hourly).
async function getTeamCount(): Promise<number> {
  "use cache";
  cacheLife("hours");
  try {
    const res = await fetch("https://jsonplaceholder.typicode.com/users");
    if (!res.ok) return 0;
    const users = (await res.json()) as unknown[];
    return users.length;
  } catch {
    return 0; // graceful fallback if offline
  }
}

export default async function HomePage() {
  const [teamCount, posts] = await Promise.all([getTeamCount(), getPosts()]);

  return (
    <div className="space-y-12">
      <section className="grid items-center gap-8 lg:grid-cols-2">
        <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Ship marketing pages <span className="text-brand-600 dark:text-brand-300">fast</span>.
        </h1>
        <p className="max-w-xl text-lg text-black/70 dark:text-white/70">
          A demo built on the Next.js 16 App Router — server-rendered for SEO and
          speed, with small client islands only where needed.
        </p>
        <p className="text-sm text-black/60 dark:text-white/60">
          {teamCount > 0
            ? `Trusted by ${teamCount}+ teams (fetched on the server).`
            : "Team count unavailable (offline) — graceful fallback."}
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/pricing"
            prefetch
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            See pricing
          </Link>
          <Link
            href="/blog"
            prefetch
            className="rounded-md border border-black/45 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/35 dark:hover:bg-white/10"
          >
            Read the blog
          </Link>
        </div>
        </div>

        {/* LCP image (Day 9):
            - static import → Next knows width/height at build, so it reserves space
              and the layout never shifts (CLS = 0) + auto blur placeholder.
            - priority → preloaded, NOT lazy-loaded (this is the hero / LCP element).
            - sizes → tells the browser the rendered width per breakpoint so it
              downloads the right srcset candidate (not the full 1600px on mobile).
            - format negotiation (AVIF/WebP) is automatic via next.config images. */}
        <Image
          src={hero}
          alt="Abstract Acme brand artwork"
          priority
          placeholder="blur"
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="rounded-card w-full h-auto"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Latest posts</h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {posts.map((post) => (
            <li
              key={post.slug}
              className="rounded-lg border border-black/10 p-4 dark:border-white/15"
            >
              <Link href={`/blog/${post.slug}`} prefetch className="font-medium hover:underline">
                {post.title}
              </Link>
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                {post.excerpt}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
