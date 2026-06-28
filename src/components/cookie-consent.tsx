"use client";
// Day 12: GDPR/CCPA cookie-consent banner. Shows until the user decides; the
// choice gates whether GTM/analytics loads (see google-tag-manager.tsx). Uses the
// same consent store via useSyncExternalStore (no effect+setState antipattern).

import { useSyncExternalStore } from "react";
import { getConsent, setConsent, subscribeConsent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

export default function CookieConsent() {
  const consent = useSyncExternalStore(subscribeConsent, getConsent, () => null);

  // Already decided → nothing to show.
  if (consent !== null) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 p-4 backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-sm text-ink-muted">
          We use cookies for analytics. Nothing loads until you choose.
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setConsent("denied")}>
            Reject
          </Button>
          <Button size="sm" onClick={() => setConsent("granted")}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
