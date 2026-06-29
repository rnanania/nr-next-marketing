import "server-only";
// Day 12 — server-side Marketo lead push (the reliable path).
//
// Why this exists: Marketo's client embed (forms2.min.js) is one of the most
// ad-blocked third-party scripts on the web — when it's blocked (or JS is off), a
// client-only form loses the lead silently. Submitting to Marketo's REST API from
// the server sidesteps that entirely and works without any client JS.
//
// Flow: OAuth client-credentials → short-lived access token → POST the lead to
// /rest/v1/leads.json (createOrUpdate). Secrets live ONLY here (`server-only` makes
// the build fail if a Client Component ever imports this), so client_id/secret
// never reach the browser. With no creds we return a fixture so the app runs.

import { z } from "zod";

const ENDPOINT = process.env.MARKETO_REST_ENDPOINT; // e.g. https://123-ABC-456.mktorest.com
const CLIENT_ID = process.env.MARKETO_CLIENT_ID;
const CLIENT_SECRET = process.env.MARKETO_CLIENT_SECRET;

export function marketoConfigured(): boolean {
  return Boolean(ENDPOINT && CLIENT_ID && CLIENT_SECRET);
}

// The lead shape we push. Validated again here (defense in depth) even though the
// action already validated — this module could be called from elsewhere.
export const leadSchema = z.object({
  email: z.email(),
  firstName: z.string().max(80).optional(),
  lastName: z.string().max(80).optional(),
  utm_source: z.string().max(120).optional(),
  utm_medium: z.string().max(120).optional(),
  utm_campaign: z.string().max(120).optional(),
  utm_term: z.string().max(120).optional(),
  utm_content: z.string().max(120).optional(),
});
export type Lead = z.infer<typeof leadSchema>;

export type LeadResult =
  | { ok: true; mode: "marketo" | "fixture"; id?: number }
  | { ok: false; error: string };

// --- OAuth token (cached in-module for its lifetime) --------------------------
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value; // reuse until ~30s before expiry
  }
  const url = `${ENDPOINT}/identity/oauth/token?grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Marketo auth failed (${res.status})`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cachedToken.value;
}

// --- Push a lead (createOrUpdate by email) ------------------------------------
export async function marketoPushLead(input: Lead): Promise<LeadResult> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid lead payload" };
  const lead = parsed.data;

  // No creds → fixture mode so the demo runs end-to-end without a Marketo instance.
  if (!marketoConfigured()) {
    console.info("[marketo] fixture mode — would push lead:", lead.email);
    return { ok: true, mode: "fixture" };
  }

  try {
    const token = await getAccessToken();
    const res = await fetch(`${ENDPOINT}/rest/v1/leads.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        action: "createOrUpdate",
        lookupField: "email",
        input: [lead], // Marketo maps these fields by API name in your instance
      }),
    });
    if (!res.ok) return { ok: false, error: `Marketo API error (${res.status})` };

    // Marketo returns HTTP 200 even for per-record failures — inspect the body.
    const json = (await res.json()) as {
      success: boolean;
      result?: { id?: number; status?: string }[];
      errors?: { message: string }[];
    };
    if (!json.success) {
      return { ok: false, error: json.errors?.[0]?.message ?? "Marketo rejected the lead" };
    }
    return { ok: true, mode: "marketo", id: json.result?.[0]?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}
