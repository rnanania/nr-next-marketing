"use client";
// CLIENT COMPONENT — a button that invokes a Server Action (no <form> needed).
//
// useTransition keeps the UI responsive while the action runs and gives us a
// `pending` flag. The action (refreshTodos) calls revalidateTag("todos","max")
// on the server; afterwards we router.refresh() so this page re-reads the now-
// stale cached data and shows the fresh upstream result.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshTodos } from "@/lib/actions";

export default function RefreshButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await refreshTodos(); // server: revalidateTag("todos", "max")
          router.refresh(); // re-fetch this route's data
        })
      }
      className="rounded border border-black/45 px-3 py-1.5 text-sm font-medium hover:bg-black/5 disabled:opacity-50 dark:border-white/35 dark:hover:bg-white/10"
    >
      {pending ? "Revalidating…" : "Revalidate “todos” tag"}
    </button>
  );
}
