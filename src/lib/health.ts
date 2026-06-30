// Day 15 — the health snapshot used by both the /api/health endpoint (a target for
// uptime monitors) and the visible /status page. Pure function of runtime state, so
// it's request-time data (uptime/timestamp change every call).

export type Health = {
  status: "ok" | "degraded";
  env: string;
  commit: string;
  region: string;
  uptimeSeconds: number;
  timestamp: string;
};

export function getHealth(simulateUnhealthy = false): Health {
  return {
    status: simulateUnhealthy ? "degraded" : "ok",
    env: process.env.VERCEL_ENV ?? "local",
    commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7) || "—",
    region: process.env.VERCEL_REGION ?? "—",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}
