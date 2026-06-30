"use client";
// Day 15 — route-level error boundary for the marketing pages. App Router error
// files must be Client Components; this one wraps every (marketing) page. When a
// render throws, React shows this fallback instead of a white screen, and we report
// the error to our observability layer (client-side path). The `digest` ties this
// UI to the matching server log line for triage.
//
// Next 16: the recovery prop is `unstable_retry` (re-fetch + re-render), not the
// older `reset`.

import { useEffect } from "react";
import Link from "next/link";
import { reportError } from "@/lib/observability";

export default function MarketingError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    reportError(error, { source: "error-boundary", boundary: "marketing", digest: error.digest });
  }, [error]);

  return (
    <div className="mx-auto max-w-xl space-y-4 py-12 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
      <p className="text-black/70 dark:text-white/70">
        We hit an unexpected error and our team has been notified. You can retry, or
        head back home.
      </p>
      {error.digest ? (
        <p className="text-xs text-ink-muted">
          Reference ID: <code className="font-mono">{error.digest}</code>
        </p>
      ) : null}
      <div className="flex justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-black/45 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/35 dark:hover:bg-white/10"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
