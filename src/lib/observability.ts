// Day 15 — provider-agnostic error reporting (the "wire Sentry" seam).
//
// In production you'd use the Sentry SDK (`Sentry.captureException`). To keep this
// study app dependency-light and runnable with zero credentials, this is a thin
// shim with the same shape: it forwards structured errors to a webhook if one is
// configured, otherwise logs structured JSON to the server console — which on Vercel
// lands in Runtime Logs, your first incident signal. Isomorphic (Node + Edge): no
// Node-only APIs, so instrumentation.ts can use it in either runtime.
//
// To wire REAL Sentry: `npm i @sentry/nextjs`, init it in instrumentation.ts'
// register(), and replace the console/webhook send below with captureException().

type ErrorContext = Record<string, unknown>;

const ERROR_WEBHOOK = process.env.ERROR_WEBHOOK_URL; // generic sink (e.g. webhook.site)
const SENTRY_DSN = process.env.SENTRY_DSN; // presence = "a real provider is configured"

export function observabilityMode(): "sentry" | "webhook" | "console" {
  if (SENTRY_DSN) return "sentry";
  if (ERROR_WEBHOOK) return "webhook";
  return "console";
}

export async function reportError(error: unknown, context: ErrorContext = {}): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error));
  const payload = {
    level: "error",
    message: err.message,
    stack: err.stack,
    digest: (err as { digest?: string }).digest,
    ...context,
    timestamp: new Date().toISOString(),
  };

  // Real provider path. With the Sentry SDK installed this would be
  // `Sentry.captureException(err, { extra: context })`. Webhook is the dependency-free
  // stand-in so the flow is observable end to end.
  if (ERROR_WEBHOOK) {
    try {
      await fetch(ERROR_WEBHOOK, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      return;
    } catch {
      // Never let the reporter swallow the incident — fall through to console.
    }
  }

  // Console is the floor: structured + greppable. On Vercel → Runtime Logs.
  console.error("[observability]", JSON.stringify(payload));
}
