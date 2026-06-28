"use client";
// Day 12: a clean Marketo Forms integration (JD calls this out explicitly).
//
// Real Marketo: load forms2.min.js, then MktoForms2.loadForm(baseUrl, munchkinId,
// formId, cb). In the callback we (a) inject UTM/attribution into hidden fields,
// and (b) override the default submit so Marketo doesn't hard-redirect — we handle
// success in-app (show a thank-you, push a `generate_lead` dataLayer event).
//
// With no Marketo creds, a styled fallback form renders the SAME fields + hidden
// UTMs + custom submit, so the page is runnable and the pattern is identical.

import { useState } from "react";
import Script from "next/script";
import { track } from "@/lib/analytics";
import type { UtmParams } from "@/lib/utm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BASE = process.env.NEXT_PUBLIC_MARKETO_BASE_URL;
const MUNCHKIN = process.env.NEXT_PUBLIC_MARKETO_MUNCHKIN_ID;
const FORM_ID = process.env.NEXT_PUBLIC_MARKETO_FORM_ID;

type MktoForm = {
  vals: (v: Record<string, string | undefined>) => void;
  onSuccess: (cb: () => boolean) => void;
};
type MktoForms2 = {
  loadForm: (base: string, munchkin: string, formId: number, cb: (form: MktoForm) => void) => void;
};
declare global {
  interface Window {
    MktoForms2?: MktoForms2;
  }
}

export default function MarketoForm({ utm }: { utm: UtmParams }) {
  const [submitted, setSubmitted] = useState(false);
  const configured = Boolean(BASE && MUNCHKIN && FORM_ID);

  function onScriptLoaded() {
    if (!configured || !window.MktoForms2) return;
    window.MktoForms2.loadForm(BASE!, MUNCHKIN!, Number(FORM_ID), (form) => {
      // Inject attribution into Marketo hidden fields (names match your Marketo schema).
      form.vals({
        uTMSource: utm.utm_source,
        uTMMedium: utm.utm_medium,
        uTMCampaign: utm.utm_campaign,
      });
      // Custom submit: stop Marketo's redirect; handle success ourselves.
      form.onSuccess(() => {
        track("generate_lead", { form: "marketo", ...utm });
        setSubmitted(true);
        return false; // prevent default thank-you redirect
      });
    });
  }

  if (submitted) {
    return (
      <p className="rounded-md border border-border bg-surface-muted px-4 py-3 text-sm">
        🎉 Thanks — we&apos;ll be in touch shortly.
      </p>
    );
  }

  // Real Marketo embed.
  if (configured) {
    return (
      <>
        <form id={`mktoForm_${FORM_ID}`} />
        <Script
          src={`${BASE}/js/forms2/js/forms2.min.js`}
          strategy="afterInteractive"
          onLoad={onScriptLoaded}
        />
      </>
    );
  }

  // Fallback demo form (no Marketo creds) — same hidden UTM fields + custom submit.
  return (
    <form
      className="max-w-md space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        track("generate_lead", { form: "demo", ...utm });
        setSubmitted(true);
      }}
    >
      <Input name="email" type="email" required placeholder="Work email" aria-label="Work email" />
      {/* Hidden attribution fields — exactly what a Marketo form would carry. */}
      {Object.entries(utm).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} readOnly />
      ))}
      <Button type="submit">Request a demo</Button>
      <p className="text-xs text-ink-muted">
        Marketo not configured — this fallback captures the same fields + UTM hidden values.
      </p>
    </form>
  );
}
