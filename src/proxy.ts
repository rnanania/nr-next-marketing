import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { EXPERIMENTS, assignVariant } from "@/lib/flags";

// Day 12: edge variant assignment for A/B testing (Next 16 renamed `middleware`
// → `proxy`). On the first visit to /campaign we pick a bucket and pin it in a
// cookie. Crucially we ALSO write it onto the forwarded request, so the page's
// cookies() sees the variant on this very request and SSRs the correct hero —
// the visitor never sees variant A flash then swap to B (no flicker, no CLS).
export function proxy(request: NextRequest) {
  const exp = EXPERIMENTS["hero-cta"];
  const existing = request.cookies.get(exp.cookie)?.value;
  const variant = existing ?? assignVariant();

  // Make the variant available to THIS request's render.
  request.cookies.set(exp.cookie, variant);
  const response = NextResponse.next({ request });

  // Persist the assignment to the browser for stickiness across visits.
  if (!existing) {
    response.cookies.set(exp.cookie, variant, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
    });
  }
  return response;
}

export const config = {
  matcher: ["/campaign"],
};
