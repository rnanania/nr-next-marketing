"use client";
// Optimistic mutation form — the React 19 "Actions" stack working together:
//
// - useActionState(reducer, initial): holds the server-confirmed list. Its
//   reducer calls the Server Action, then returns the new state (or an error).
//   Also gives us `isPending`.
// - useOptimistic(base, updater): renders an *instant* optimistic copy of the
//   list (the new message appears immediately, greyed, marked "sending"), then
//   reconciles to the real list when the action resolves.
// - useFormStatus(): the submit button reads the form's pending state.
// - `ref` passed as a normal prop to <TextInput> (no forwardRef) to refocus.
//
// No useMemo/useCallback here either — the React Compiler handles memoization.

import { useActionState, useOptimistic, useRef } from "react";
import { useFormStatus } from "react-dom";
import { submitFeedback, type Feedback } from "@/lib/feedback-actions";
import TextInput from "@/components/text-input";

type Msg = Feedback & { pending?: boolean };
type WallState = { messages: Msg[]; error?: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
    >
      {pending ? "Posting…" : "Post"}
    </button>
  );
}

export default function FeedbackWall({ initial }: { initial: Feedback[] }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [state, dispatch] = useActionState(
    async (prev: WallState, formData: FormData): Promise<WallState> => {
      try {
        const saved = await submitFeedback(formData); // server validates + persists
        return { messages: [saved, ...prev.messages] };
      } catch (e) {
        return {
          messages: prev.messages,
          error: e instanceof Error ? e.message : "Something went wrong.",
        };
      }
    },
    { messages: initial },
  );

  const [optimistic, addOptimistic] = useOptimistic(
    state.messages,
    (cur, draft: Msg) => [draft, ...cur],
  );

  // Custom form action: show the optimistic item first, then dispatch the
  // server reducer. Running as a <form action> means we're inside a transition,
  // which is what useOptimistic requires.
  async function action(formData: FormData) {
    const text = String(formData.get("text") ?? "").trim();
    if (text) {
      addOptimistic({ id: "optimistic", name: "You", text, pending: true });
    }
    inputRef.current?.focus();
    dispatch(formData);
  }

  return (
    <section className="space-y-4">
      <form action={action} className="flex flex-col gap-2 sm:flex-row">
        <TextInput ref={inputRef} name="name" aria-label="Your name (optional)" placeholder="Name (optional)" className="sm:w-40" />
        <TextInput name="text" aria-label="Your feedback" placeholder="Leave feedback…" required className="flex-1" />
        <SubmitButton />
      </form>

      {state.error ? (
        <p aria-live="polite" className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}

      <ul className="space-y-2">
        {optimistic.map((m) => (
          <li
            key={m.id === "optimistic" ? `opt-${m.text}` : m.id}
            className="rounded border border-black/10 p-3 text-sm dark:border-white/15"
            style={{ opacity: m.pending ? 0.5 : 1 }}
          >
            <span className="font-medium">{m.name}</span>: {m.text}
            {m.pending ? <span className="ml-2 text-xs text-black/60">sending…</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
