// PARTIAL PRERENDERING (PPR) demo — the default with Cache Components.
//
// The page is a STATIC SHELL (heading + section labels are prerendered) with two
// DYNAMIC HOLES streamed at request time:
//   1. <NewsMeta>  — reads searchParams + a per-request timestamp (needs connection())
//   2. <SlowHeadlines> — slow request-time data
//
// Because the dynamic parts are wrapped in <Suspense>, Next ships the static shell
// instantly and streams the holes in when ready. Note the page function itself does
// NOT await searchParams — that would make the whole route dynamic. We pass the
// promise down into a Suspense-wrapped child instead.

import { Suspense } from "react";
import { connection } from "next/server";
import SlowHeadlines from "@/components/slow-headlines";

export const metadata = {
  title: "News — Acme",
  description: "Static shell + streamed dynamic holes (PPR).",
};

// Dynamic hole #1: per-request metadata.
// Type derived from the route's generated PageProps so it stays in sync.
async function NewsMeta({
  searchParams,
}: {
  searchParams: PageProps<"/news">["searchParams"];
}) {
  await connection(); // defer to request time (needed for the timestamp below)
  const { topic } = await searchParams;
  const requestTime = new Date().toISOString();
  return (
    <p className="text-sm text-black/60 dark:text-white/60">
      Rendered on the server at <code>{requestTime}</code>
      {topic ? <> · filtered by topic: <strong>{topic}</strong></> : null}.
      Reload — the time changes every request (this hole is dynamic; the shell is static).
    </p>
  );
}

// Animated skeleton fallbacks — the `animate-pulse` is obvious on solid bars
// (vs. a single line of text, where the opacity fade is barely visible).
function MetaSkeleton() {
  return <div className="h-4 w-2/3 animate-pulse rounded bg-black/10 dark:bg-white/15" />;
}

function HeadlinesSkeleton() {
  return (
    <ul className="space-y-2">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="h-12 animate-pulse rounded border border-black/10 bg-black/5 dark:border-white/15 dark:bg-white/10"
        />
      ))}
    </ul>
  );
}

// PageProps<'/news'> is a global helper Next generates from the route — no import,
// no hand-written Promise type. It includes `searchParams` (and `params` if any).
export default async function NewsPage({ searchParams }: PageProps<"/news">) {
  return (
    <div className="space-y-6">
      {/* Static shell — prerendered */}
      <h1 className="text-3xl font-bold tracking-tight">News</h1>

      {/* Dynamic hole #1 — streams in */}
      <Suspense fallback={<MetaSkeleton />}>
        <NewsMeta searchParams={searchParams} />
      </Suspense>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Latest headlines</h2>
        {/* Dynamic hole #2 — streams in after ~2s */}
        <Suspense fallback={<HeadlinesSkeleton />}>
          <SlowHeadlines />
        </Suspense>
      </section>
    </div>
  );
}
