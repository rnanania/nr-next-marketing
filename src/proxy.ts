import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { EXPERIMENTS, assignVariant } from "@/lib/flags";
import { UTM_FIRST_TOUCH_COOKIE, readUtmParams, hasUtm, serializeUtm } from "@/lib/utm";

// Day 12: edge work that must happen BEFORE render (Next 16 renamed `middleware`
// → `proxy`). Two jobs:
//   1. First-touch UTM capture (site-wide): the first time a visitor arrives with
//      ?utm_* params, pin them in a cookie so the lead stays attributable even after
//      internal navigation strips the query string.
//   2. A/B variant assignment (only on /campaign): pick + pin a bucket and write it
//      onto THIS request so the page SSRs the right hero — no flicker / CLS.
export function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  // --- 1. First-touch UTM (any matched route) -------------------------------
  const url = request.nextUrl;
  const incomingUtm = readUtmParams(url.searchParams);
  const hasFirstTouch = request.cookies.has(UTM_FIRST_TOUCH_COOKIE);
  if (hasUtm(incomingUtm) && !hasFirstTouch) {
    response.cookies.set(UTM_FIRST_TOUCH_COOKIE, serializeUtm(incomingUtm), {
      path: "/",
      maxAge: 60 * 60 * 24 * 90, // 90 days of attribution
      sameSite: "lax",
    });
  }

  // --- 2. A/B variant (campaign only) ---------------------------------------
  if (url.pathname === "/campaign") {
    const exp = EXPERIMENTS["hero-cta"];
    const existing = request.cookies.get(exp.cookie)?.value;
    const variant = existing ?? assignVariant();

    // Make the variant available to THIS request's render (no A→B flash).
    request.cookies.set(exp.cookie, variant);
    if (!existing) {
      response.cookies.set(exp.cookie, variant, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: "lax",
      });
    }
  }

  return response;
}

export const config = {
  // Run on real pages so first-touch UTMs are captured anywhere a campaign link
  // can land — but skip API routes, static assets, and metadata files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|opengraph-image).*)"],
};
