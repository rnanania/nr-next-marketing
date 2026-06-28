// Day 11 — a CMS-driven landing page sourced from Contentful (Delivery API when
// published, Preview API in draft mode). The page doesn't know about individual
// block shapes: it loads validated content and hands the blocks to <BlockRenderer>,
// which resolves each by its discriminant. Page-builder pattern, type-safe end to
// end with zod. When draft mode is on, editors see unpublished content + a banner.

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
          {/* Plain <a>, NOT <Link>: toggling Draft Mode runs in a Route Handler and
              must happen via a full (hard) navigation. A <Link> soft-navigates —
              the Router Cache would re-show the preview=true payload, so the banner
              never clears ("Exit preview does nothing"). A hard GET lets the handler
              clear the __prerender_bypass cookie and redirect to a fresh render. */}
          <a href="/api/preview/disable" className="font-medium underline">
            Exit preview
          </a>
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
