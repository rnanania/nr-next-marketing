"use client";
// Day 12: Marketo Forms — two integration modes behind one component (JD calls this
// out explicitly). The right mode is picked from which credentials are present:
//
//  MODE 1 — Classic embed (NEXT_PUBLIC_MARKETO_* set): load forms2.min.js, then
//    MktoForms2.loadForm(...). In the callback we (a) inject UTM/attribution into
//    hidden fields and (b) override submit so Marketo doesn't hard-redirect — we
//    handle success in-app (thank-you + `generate_lead` dataLayer event).
//
//  MODE 2 — First-party form + server submit (default / no client creds): a real
//    <form action={submitLead}> wired via useActionState. The lead reaches the
//    server even if JS never loads or Marketo's script is ad-blocked (forms2.min.js
//    is widely blocked) — progressive enhancement + reliability. The Server Action
//    validates with zod and pushes to Marketo's REST API server-side (fixture mode
//    without creds). This is the recommended production path.
//
// Consent note: the lead form is an EXPLICIT user action (the lawful basis is the
// submission itself), so it isn't gated behind the cookie banner like GTM. We also
// deliberately do NOT load Munchkin behavioral tracking here — that *would* be
// consent-gated. See docs/marketo_integration.md.

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Script from "next/script";
import { track } from "@/lib/analytics";
import { submitLead, type LeadState } from "@/lib/actions";
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
  const configured = Boolean(BASE && MUNCHKIN && FORM_ID);
  return configured ? <MarketoEmbed utm={utm} /> : <ServerLeadForm utm={utm} />;
}

// MODE 1 — classic Marketo embed.
function MarketoEmbed({ utm }: { utm: UtmParams }) {
  const [submitted, setSubmitted] = useState(false);

  function onScriptLoaded() {
    if (!window.MktoForms2) return;
    window.MktoForms2.loadForm(BASE!, MUNCHKIN!, Number(FORM_ID), (form) => {
      // Inject attribution into Marketo hidden fields (names match your Marketo schema).
      form.vals({
        uTMSource: utm.utm_source,
        uTMMedium: utm.utm_medium,
        uTMCampaign: utm.utm_campaign,
      });
      form.onSuccess(() => {
        track("generate_lead", { form: "marketo", ...utm });
        setSubmitted(true);
        return false; // prevent Marketo's default thank-you redirect
      });
    });
  }

  if (submitted) return <ThankYou />;
  return (
    <>
      <form id={`mktoForm_${FORM_ID}`} />
      <Script src={`${BASE}/js/forms2/js/forms2.min.js`} strategy="afterInteractive" onLoad={onScriptLoaded} />
    </>
  );
}

// MODE 2 — first-party form backed by a Server Action (reliable, no-JS-friendly).
const initialState: LeadState = { ok: false, message: "" };

function ServerLeadForm({ utm }: { utm: UtmParams }) {
  const [state, formAction] = useActionState(submitLead, initialState);

  // Mirror the lead into the dataLayer once the server confirms success. This is a
  // real side effect on a state change, so useEffect is correct (React Compiler on).
  useEffect(() => {
    if (state.ok) track("generate_lead", { form: "marketo-rest", ...utm });
  }, [state.ok, utm]);

  if (state.ok) return <ThankYou />;

  return (
    <form action={formAction} className="max-w-md space-y-3">
      <Input name="firstName" type="text" placeholder="First name" aria-label="First name" />
      <Input name="email" type="email" required placeholder="Work email" aria-label="Work email" />
      {/* Hidden attribution fields — exactly what a Marketo form carries; validated
          again server-side in submitLead. */}
      {Object.entries(utm).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} readOnly />
      ))}
      <SubmitButton />
      {state.message && !state.ok ? (
        <p aria-live="polite" className="text-sm text-red-600 dark:text-red-400">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Submitting…" : "Request a demo"}
    </Button>
  );
}

function ThankYou() {
  return (
    <p className="rounded-md border border-border bg-surface-muted px-4 py-3 text-sm" aria-live="polite">
      🎉 Thanks — we&apos;ll be in touch shortly.
    </p>
  );
}
