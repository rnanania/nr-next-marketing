// Day 11 — a CMS-driven landing page sourced from Contentful (Delivery API when
// published, Preview API in draft mode). The page doesn't know about individual
// block shapes: it loads validated content and hands the blocks to <BlockRenderer>,
// which resolves each by its discriminant. Page-builder pattern, type-safe end to
// end with zod. When draft mode is on, editors see unpublished content + a banner.

import Link from "next/link";
import { getLandingPage } from "@/lib/cms/contentful";
import BlockRenderer from "@/components/block-renderer";

export const metadata = {
  title: "Landing — Pace",
  description: "Type-safe, CMS-driven page built from validated Contentful blocks.",
};

export default async function LandingPage() {
  const { page, preview } = await getLandingPage();

  return (
    <div className="space-y-8">
      {preview ? (
        <div className="flex items-center justify-between rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm">
          <span>🚧 Preview mode — showing unpublished Contentful drafts.</span>
          {/* prefetch={false} so a hover/prefetch doesn't accidentally drop the cookie */}
          <Link href="/api/preview/disable" prefetch={false} className="font-medium underline">
            Exit preview
          </Link>
        </div>
      ) : null}

      <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
      <p className="text-sm text-black/60 dark:text-white/60">
        {page.blocks.length} content blocks from Contentful, validated with zod,
        rendered by a single exhaustive <code>&lt;Section&gt;</code> resolver.
      </p>
      <BlockRenderer blocks={page.blocks} />
    </div>
  );
}
