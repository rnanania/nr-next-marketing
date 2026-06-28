"use server";
// SERVER ACTIONS — async functions that run on the server but are callable from
// the client (over a POST). The "use server" directive at the top of the file
// marks every export as a Server Action. They're how you do mutations in the App
// Router (form submits, button clicks) without hand-writing an API route.
//
// Security note: actions are reachable via direct POST, not just your UI — always
// validate/authorize inside them (here: validate the email).

import { revalidateTag } from "next/cache";

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

// On-demand revalidation triggered from the UI (a button → Server Action).
// Same primitive a CMS webhook uses, but initiated by an editor action.
export async function refreshTodos(): Promise<void> {
  revalidateTag("todos", "max");
}
