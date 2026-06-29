"use client";
// Day 12: GTM loaded the performance- and privacy-correct way.
// - next/script strategy="afterInteractive" → non-blocking (Day 9).
// - Consent-gated: the GTM snippet is only injected once the user GRANTS consent
//   (read reactively via useSyncExternalStore over the consent cookie). Before
//   that, no analytics scripts/cookies load at all.

import Script from "next/script";
import { useSyncExternalStore } from "react";
import { getConsent, subscribeConsent } from "@/lib/analytics";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "GTM-DEMO123";

export default function GoogleTagManager() {
  const consent = useSyncExternalStore(subscribeConsent, getConsent, () => null);

  if (consent !== "granted") return null;

  // This component only mounts once consent is GRANTED, so the loader emits the
  // full Consent Mode v2 handshake in the correct order: define the gtag() stub →
  // default everything to `denied` → `update` to `granted` → then load GTM. Doing
  // it inside the snippet (rather than relying on earlier dataLayer pushes)
  // guarantees ordering — default must precede update, before gtm.js runs.
  return (
    <Script id="gtm" strategy="afterInteractive">
      {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',analytics_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});gtag('consent','update',{ad_storage:'granted',analytics_storage:'granted',ad_user_data:'granted',ad_personalization:'granted'});(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
    </Script>
  );
}
