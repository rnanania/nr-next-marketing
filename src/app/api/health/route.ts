// Day 15 — a health-check endpoint, the classic target for uptime monitors
// (Pingdom / BetterStack / a load balancer). Returns 200 + JSON when healthy.
//
// `connection()` forces per-request execution so a monitor always sees LIVE status
// (never a cached/prerendered snapshot). `?simulate=unhealthy` returns 503 so you
// can demonstrate the alert/incident-detection path without breaking anything.

import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getHealth } from "@/lib/health";

export async function GET(request: Request) {
  await connection();
  const simulate = new URL(request.url).searchParams.get("simulate") === "unhealthy";
  const health = getHealth(simulate);
  return NextResponse.json(health, {
    status: health.status === "ok" ? 200 : 503,
    headers: { "cache-control": "no-store" },
  });
}
