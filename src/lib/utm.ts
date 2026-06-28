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
