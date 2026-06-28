"use client";
// ERROR BOUNDARY for the /features segment.
//
// error.tsx MUST be a Client Component — error boundaries rely on class-component
// lifecycle (componentDidCatch) under the hood, which only runs on the client. It
// catches render/runtime errors thrown by this segment's tree and shows fallback
// UI instead of a white screen. `reset()` re-renders the segment to retry.

import { useEffect } from "react";

export default function FeaturesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In real apps: report to Sentry/observability here (Day 15).
    console.error("Features segment error:", error);
  }, [error]);

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-sm text-black/60 dark:text-white/60">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white"
      >
        Try again
      </button>
    </div>
  );
}
