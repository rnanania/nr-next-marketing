"use client";
// Day 12: GDPR requires withdrawing consent to be as easy as granting it. This
// footer control clears the stored decision (via resetConsent), which re-opens the
// consent banner and signals Consent Mode `denied` to any tags already loaded this
// session. (Fully unloading GTM's scripts would need a page reload — by design we
// stop further data collection rather than force a reload.)

import { useSyncExternalStore } from "react";
import { getConsent, resetConsent, subscribeConsent } from "@/lib/analytics";

export default function CookieSettingsButton() {
  const consent = useSyncExternalStore(subscribeConsent, getConsent, () => null);

  // No decision yet → the banner is already showing; nothing to manage.
  if (consent === null) return null;

  return (
    <button
      type="button"
      onClick={resetConsent}
      className="underline underline-offset-2 hover:text-ink"
    >
      Cookie settings
    </button>
  );
}
