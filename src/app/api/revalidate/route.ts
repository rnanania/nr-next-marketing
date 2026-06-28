import type { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { apiConfig } from "@/lib/server/env";

// WEBHOOK-STYLE on-demand revalidation — the exact Contentful pattern (Day 11).
//
// An external system (a CMS publish event, an admin tool) POSTs here when content
// changes. We verify a shared secret, then invalidate cached data BY TAG. The
// next visitor to any page/handler tagged with that tag gets fresh data — no
// redeploy, no waiting for the time-based window.
//
//   curl -X POST "http://localhost:3000/api/revalidate?secret=dev-secret&tag=todos"
//
// Note the Next 16 signature: `revalidateTag(tag, "max")`. The single-argument
// form is deprecated. "max" = stale-while-revalidate (serve stale, refresh in
// the background). For webhooks needing *immediate* expiry, pass `{ expire: 0 }`.
export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const secret = searchParams.get("secret");

  if (secret !== apiConfig.webhookSecret) {
    return Response.json(
      { revalidated: false, error: "invalid secret" },
      { status: 401 },
    );
  }

  const tag = searchParams.get("tag") ?? "todos";
  revalidateTag(tag, "max");

  return Response.json({ revalidated: true, tag, now: Date.now() });
}
