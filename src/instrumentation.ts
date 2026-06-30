// Day 15 — the idiomatic Next 16 observability entrypoint. `instrumentation.ts` is
// stable (no config flag) and runs at server boot in both Node and Edge runtimes.
//
// - register(): one-time boot hook — where you'd init Sentry / OpenTelemetry.
// - onRequestError(): Next calls this whenever the server captures an error
//   (RSC render, route handler, Server Action, or the edge proxy), so it's the
//   single funnel for SERVER errors into our reporter.

import type { Instrumentation } from "next";
import { observabilityMode, reportError } from "@/lib/observability";

export function register() {
  // Real Sentry/OTel init goes here (e.g. registerOTel("pace"), Sentry.init({ dsn })).
  console.info(
    `[instrumentation] booted · observability=${observabilityMode()} · runtime=${process.env.NEXT_RUNTIME ?? "nodejs"}`,
  );
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  await reportError(err, {
    source: "onRequestError",
    path: request.path,
    method: request.method,
    routerKind: context.routerKind,
    routeType: context.routeType, // render | route | action | proxy
    routePath: context.routePath,
  });
};
