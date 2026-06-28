"use client";
// CLIENT COMPONENT — a form island wired to a Server Action.
//
// - useActionState(action, initial): calls the Server Action on submit and gives
//   you back [state, formAction, pending]. The returned `state` is whatever the
//   action returns (our SubscribeState), so we can render success/error inline.
// - useFormStatus(): read by a child of the <form> to know if it's submitting —
//   used here to disable the button and show a pending label.
//
// Progressive enhancement: because it's a real <form action={...}>, it submits
// even before JS hydrates.

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { subscribe, type SubscribeState } from "@/lib/actions";

const initialState: SubscribeState = { ok: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 sm:w-auto"
    >
      {pending ? "Subscribing…" : "Subscribe"}
    </button>
  );
}

export default function SubscribeForm() {
  const [state, formAction] = useActionState(subscribe, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          name="email"
          required
          placeholder="you@company.com"
          aria-label="Email address"
          className="flex-1 rounded border border-black/45 px-3 py-2 text-sm dark:border-white/35 dark:bg-transparent"
        />
        <SubmitButton />
      </div>
      {state.message ? (
        <p
          aria-live="polite"
          className={
            state.ok
              ? "text-sm text-green-700 dark:text-green-400"
              : "text-sm text-red-600 dark:text-red-400"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
