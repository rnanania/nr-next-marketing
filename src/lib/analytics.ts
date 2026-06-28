// Day 12: a thin analytics layer over a GTM-style dataLayer, plus a consent store.
// Privacy first: nothing tracks until the user grants consent (GDPR/CCPA). These
// are browser-runtime helpers (guarded for SSR) used by client components.

export type Consent = "granted" | "denied";
const CONSENT_COOKIE = "cookie-consent";

// --- dataLayer (GTM / GA4) ----------------------------------------------------
type DataLayerWindow = Window & { dataLayer?: Record<string, unknown>[] };

export function track(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  const w = window as DataLayerWindow;
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event, ...params });
}

// --- Consent store (readable via useSyncExternalStore) ------------------------
export function getConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)cookie-consent=(granted|denied)/);
  return m ? (m[1] as Consent) : null;
}

export function setConsent(value: Consent): void {
  if (typeof document === "undefined") return;
  document.cookie = `${CONSENT_COOKIE}=${value};path=/;max-age=${60 * 60 * 24 * 180};samesite=lax`;
  // GTM Consent Mode update — flips storage permissions for tags downstream.
  track("consent_update", { analytics_storage: value, ad_storage: value });
  window.dispatchEvent(new Event("consentchange"));
}

export function subscribeConsent(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("consentchange", onChange);
  return () => window.removeEventListener("consentchange", onChange);
}
