"use client";
// Day 15 — the LAST-resort error boundary. global-error.tsx catches errors thrown in
// the root layout itself (which route-level error.tsx cannot), and it REPLACES the
// root layout when active — so it must render its own <html>/<body>. Tailwind/global
// styles may not be applied here, so we use inline styles to guarantee a usable page.

import { useEffect } from "react";
import { reportError } from "@/lib/observability";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    reportError(error, { source: "global-error", boundary: "root", digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <title>Something went wrong — Pace</title>
        <main
          style={{
            maxWidth: 480,
            margin: "0 auto",
            padding: "64px 24px",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ color: "#666", lineHeight: 1.5 }}>
            The site hit a critical error and our team has been notified. Please try
            again in a moment.
          </p>
          {error.digest ? (
            <p style={{ fontSize: 12, color: "#888" }}>Reference ID: {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              marginTop: 16,
              background: "#2563eb",
              color: "#fff",
              border: 0,
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
