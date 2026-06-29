"use server";
// SERVER ACTIONS — async functions that run on the server but are callable from
// the client (over a POST). The "use server" directive at the top of the file
// marks every export as a Server Action. They're how you do mutations in the App
// Router (form submits, button clicks) without hand-writing an API route.
//
// Security note: actions are reachable via direct POST, not just your UI — always
// validate/authorize inside them (here: validate the email).

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { track } from "@vercel/analytics/server";
import { marketoPushLead } from "@/lib/server/marketo";

export type SubscribeState = {
  ok: boolean;
  message: string;
};

// Mutation invoked by <form action={...}> via useActionState.
// Signature is (prevState, formData) so the form can show the result.
export async function subscribe(
  _prev: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const email = String(formData.get("email") ?? "").trim();

  // Validate on the server (never trust the client).
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, message: "Please enter a valid email address." };
  }

  // Pretend to persist the lead (DB / Marketo / CRM — Day 12).
  await new Promise((r) => setTimeout(r, 600));

  return { ok: true, message: `Thanks — ${email} is subscribed.` };
}

// --- Marketo lead capture (the reliable, no-JS-friendly path) ----------------
// This Server Action backs the campaign lead form. Because it's a real
// <form action={submitLead}>, the lead reaches the server even if JS never loads
// or Marketo's client script is ad-blocked. We validate at the boundary with zod,
// then hand off to the server-only Marketo REST client (fixture mode w/o creds).

export type LeadState = {
  ok: boolean;
  message: string;
};

// Hidden UTM inputs arrive as form fields; validate them alongside the email.
const utm = z.string().trim().max(120).optional();
const leadFormSchema = z.object({
  email: z.email("Please enter a valid work email."),
  firstName: z.string().trim().max(80).optional(),
  utm_source: utm,
  utm_medium: utm,
  utm_campaign: utm,
  utm_term: utm,
  utm_content: utm,
});

export async function submitLead(_prev: LeadState, formData: FormData): Promise<LeadState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = leadFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid submission." };
  }

  const result = await marketoPushLead(parsed.data);
  if (!result.ok) {
    return { ok: false, message: "Something went wrong — please try again." };
  }

  // Server-side Vercel Analytics custom event → shows up in Analytics → Events as a
  // countable "lead" metric. Firing it here (after the lead is confirmed, on the
  // server) means it can't be ad-blocked or lost like a client beacon. Cookieless,
  // so no consent gate. No-op locally / off Vercel.
  await track("lead", {
    mode: result.mode, // "marketo" | "fixture" — distinguishes real vs demo leads
    utm_source: parsed.data.utm_source ?? "direct",
    utm_campaign: parsed.data.utm_campaign ?? "none",
  });

  return { ok: true, message: "Thanks — we'll be in touch shortly." };
}

// On-demand revalidation triggered from the UI (a button → Server Action).
// Same primitive a CMS webhook uses, but initiated by an editor action.
export async function refreshTodos(): Promise<void> {
  revalidateTag("todos", "max");
}
