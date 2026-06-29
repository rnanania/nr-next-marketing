// Day 12: a thin analytics layer over a GTM-style dataLayer, plus a consent store.
// Privacy first: nothing tracks until the user grants consent (GDPR/CCPA). These
// are browser-runtime helpers (guarded for SSR) used by client components.

export type Consent = "granted" | "denied";
const CONSENT_COOKIE = "cookie-consent";

// --- dataLayer (GTM / GA4) ----------------------------------------------------
type DataLayerWindow = Window & { dataLayer?: Record<string, unknown>[] };

function dataLayer(): unknown[] {
  const w = window as DataLayerWindow & { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  return w.dataLayer;
}

// Custom *event* push: GTM reads `{ event, ...params }` objects to fire triggers.
export function track(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  dataLayer().push({ event, ...params });
}

// Google Consent Mode v2 reads a DIFFERENT shape: `arguments`-style entries, e.g.
// ["consent","update",{analytics_storage:"granted"}] — NOT an {event} object.
// This mirrors the canonical `gtag()` stub (`function gtag(){dataLayer.push(arguments)}`).
type ConsentState = "granted" | "denied";
function gtag(...args: unknown[]): void {
  if (typeof window === "undefined") return;
  dataLayer().push(args);
}

// The four Consent Mode v2 signals, set together. Default is denied for everyone.
function consentSignals(state: ConsentState) {
  return {
    ad_storage: state,
    analytics_storage: state,
    ad_user_data: state,
    ad_personalization: state,
  };
}

// Note: the `default` signal (deny everything up front) is emitted inside the GTM
// loader snippet so its ordering vs. gtm.js is guaranteed — see google-tag-manager.tsx.
export function consentUpdate(state: ConsentState): void {
  gtag("consent", "update", consentSignals(state));
}

// Has the GTM loader snippet already run this session? Consent Mode v2 requires the
// `default` signal to come FIRST, and the snippet emits the full default→update
// handshake itself. So we only push a standalone `update` from the store when GTM is
// already live (a later toggle) — on a fresh grant we'd otherwise queue an `update`
// BEFORE the snippet's `default`, which is out of spec (and ignored by GTM anyway).
function gtmLoaded(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as DataLayerWindow & { google_tag_manager?: unknown };
  if (w.google_tag_manager) return true; // set once a real gtm.js executes
  // Fallback for the demo/fake container (gtm.js 404s): the loader still pushes gtm.js.
  return (w.dataLayer ?? []).some((e) => (e as { event?: string }).event === "gtm.js");
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
  // Only signal Consent Mode if GTM is ALREADY loaded (a later toggle). On a fresh
  // grant GTM isn't loaded yet, so the loader snippet replays the full
  // default→update handshake itself — pushing here would queue an out-of-order
  // `update` before that `default`. See gtmLoaded() / google-tag-manager.tsx.
  if (gtmLoaded()) consentUpdate(value);
  window.dispatchEvent(new Event("consentchange"));
}

// Withdraw consent (GDPR: withdrawal must be as easy as granting). Clears the
// decision so the banner returns, and signals Consent Mode `denied` for any tags
// already loaded this session. A full unload of GTM requires a reload — documented.
export function resetConsent(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${CONSENT_COOKIE}=;path=/;max-age=0;samesite=lax`;
  if (gtmLoaded()) consentUpdate("denied"); // only meaningful if GTM already loaded
  window.dispatchEvent(new Event("consentchange"));
}

export function subscribeConsent(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("consentchange", onChange);
  return () => window.removeEventListener("consentchange", onChange);
}
