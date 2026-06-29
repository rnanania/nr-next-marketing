// Day 12 — a campaign landing page combining the three marketing concerns:
//   1. A/B test: the hero variant is assigned at the edge (proxy.ts) and read
//      server-side from the cookie, so the correct variant is in the HTML — no
//      client flicker / CLS (the "A/B without hurting CWV" answer).
//   2. Attribution: UTM params are read from the URL and fed to the form.
//   3. Lead capture: a Marketo form with UTM hidden fields + custom submit.
//
// cookies()/searchParams are request-time, so each lives in its own <Suspense>
// hole — the page is a static shell with dynamic holes (PPR, Day 2).

import { Suspense } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { EXPERIMENTS, isVariant } from "@/lib/flags";
import { readUtmParams, parseUtm, hasUtm, UTM_FIRST_TOUCH_COOKIE } from "@/lib/utm";
import MarketoForm from "@/components/marketo-form";

export const metadata = {
  title: "Campaign — Pace",
  description: "Campaign landing page: edge A/B variant + UTM attribution + lead form.",
};

// Dynamic hole #1 — the experiment hero, rendered server-side per assigned bucket.
async function CampaignHero() {
  const exp = EXPERIMENTS["hero-cta"];
  const raw = (await cookies()).get(exp.cookie)?.value;
  const variant = isVariant(raw) ? raw : "A";
  const copy = exp.variants[variant];

  return (
    <section className="rounded-card bg-linear-to-br from-brand-700 to-brand-900 px-6 py-12 text-white sm:px-10">
      <p className="text-xs uppercase tracking-wider text-brand-100">
        Experiment hero-cta · variant {variant}
      </p>
      <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
        {copy.headline}
      </h1>
      <Link href="#lead" className="btn-brand mt-5">
        {copy.cta}
      </Link>
    </section>
  );
}

// Dynamic hole #2 — UTM attribution + the lead form.
async function CampaignLead({ searchParams }: { searchParams: PageProps<"/campaign">["searchParams"] }) {
  // Last-touch = current URL; first-touch = the persisted edge cookie (proxy.ts).
  // We attribute to first-touch when we have it (durable across navigation), else
  // fall back to whatever is on the URL right now.
  const urlUtm = readUtmParams(await searchParams);
  const firstTouch = parseUtm((await cookies()).get(UTM_FIRST_TOUCH_COOKIE)?.value);
  const utm = hasUtm(firstTouch) ? firstTouch : urlUtm;
  return (
    <section id="lead" className="space-y-3">
      <h2 className="text-2xl font-semibold tracking-tight">Talk to sales</h2>
      <p className="text-sm text-ink-muted">
        Attributed to: <strong>{utm.utm_source ?? "direct"}</strong>
        {utm.utm_campaign ? <> · campaign <strong>{utm.utm_campaign}</strong></> : null}
      </p>
      <MarketoForm utm={utm} />
    </section>
  );
}

export default function CampaignPage({ searchParams }: PageProps<"/campaign">) {
  return (
    <div className="space-y-10">
      <Suspense fallback={<div className="h-48 animate-pulse rounded-card bg-black/5 dark:bg-white/10" />}>
        <CampaignHero />
      </Suspense>
      <Suspense fallback={<div className="h-32 max-w-md animate-pulse rounded bg-black/5 dark:bg-white/10" />}>
        <CampaignLead searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
