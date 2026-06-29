"use client";
// Day 12: SPA page-view tracking. GTM's container fires a pageview only on the
// initial hard load — App Router client navigations (<Link>) never reload the
// page, so without this they'd go uncounted. We push a `page_view` event on every
// route change (configure a GTM trigger on it). Consent-gated like everything else.
//
// Firing analytics on navigation is a real external side effect (not state sync),
// so useEffect is the correct tool here — not useSyncExternalStore (that's for the
// consent READ below) and not the effect-then-setState antipattern.

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { getConsent, subscribeConsent, track } from "@/lib/analytics";

export default function AnalyticsPageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const consent = useSyncExternalStore(subscribeConsent, getConsent, () => null);

  useEffect(() => {
    if (consent !== "granted") return;
    const qs = searchParams.toString();
    track("page_view", { page_path: qs ? `${pathname}?${qs}` : pathname });
  }, [pathname, searchParams, consent]);

  return null;
}
