// Day 12: UTM / attribution helpers. Campaign links carry ?utm_source=…&utm_medium=…
// We read them, persist first-touch attribution, and feed them into analytics and
// Marketo hidden fields so leads are attributable to the campaign that drove them.

export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export type UtmParams = Partial<Record<(typeof UTM_KEYS)[number], string>>;

// First-touch attribution cookie: the UTMs from the campaign that FIRST brought the
// visitor here, persisted so the lead is still attributable after they navigate
// around (the URL loses ?utm_* on internal <Link> clicks). Written once at the edge
// (proxy.ts); read on the campaign page.
export const UTM_FIRST_TOUCH_COOKIE = "utm_first";

// Pull UTM params out of any URLSearchParams-like object.
export function readUtmParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): UtmParams {
  const get = (k: string) =>
    params instanceof URLSearchParams
      ? params.get(k) ?? undefined
      : (Array.isArray(params[k]) ? params[k][0] : params[k]) ?? undefined;

  const out: UtmParams = {};
  for (const key of UTM_KEYS) {
    const value = get(key);
    if (value) out[key] = value;
  }
  return out;
}

export function hasUtm(utm: UtmParams): boolean {
  return UTM_KEYS.some((k) => utm[k]);
}

// Cookie value is JSON of the UTM object. We do NOT URL-encode it ourselves — the
// Next cookies API handles transport encoding on set() and decoding on get(), so
// encoding here would double-encode (%7B → %257B).
export function serializeUtm(utm: UtmParams): string {
  return JSON.stringify(utm);
}

export function parseUtm(raw: string | undefined): UtmParams {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const out: UtmParams = {};
    for (const key of UTM_KEYS) {
      if (typeof obj[key] === "string") out[key] = obj[key] as string;
    }
    return out;
  } catch {
    return {}; // tampered/garbage cookie → no attribution rather than a crash
  }
}
