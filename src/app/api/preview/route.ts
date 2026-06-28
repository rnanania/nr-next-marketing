import type { NextRequest } from "next/server";
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { apiConfig } from "@/lib/server/env";

// Day 11: enable Draft Mode (Contentful Preview). A CMS "Open preview" button links
// here with a secret; we verify it, set the draft cookie (draftMode().enable()),
// and redirect to the page — which then renders Preview-API (unpublished) content.
//
//   /api/preview?secret=dev-secret&redirect=/landing
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  if (searchParams.get("secret") !== apiConfig.webhookSecret) {
    return new Response("Invalid preview secret", { status: 401 });
  }
  const draft = await draftMode();
  draft.enable();
  redirect(searchParams.get("redirect") ?? "/landing");
}
