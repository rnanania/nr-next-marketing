// Day 15 — a visible status page (a mini uptime dashboard). Static shell + a dynamic
// hole that reads live health at request time (connection() → PPR, Day 2). Backed by
// the same getHealth() the /api/health monitor endpoint uses, so the page and the
// machine-readable check never disagree.

import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getHealth } from "@/lib/health";

export const metadata = {
  title: "Status — Pace",
  description: "Live operational status of the Pace site (Day 15: ops & reliability).",
};

async function HealthCards() {
  await connection(); // live, never cached
  const h = getHealth();
  const fields: [string, string][] = [
    ["Status", h.status],
    ["Environment", h.env],
    ["Region", h.region],
    ["Commit", h.commit],
    ["Uptime", `${h.uptimeSeconds}s`],
    ["Checked", new Date(h.timestamp).toLocaleTimeString()],
  ];
  return (
    <div className="space-y-4">
      <div
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${
          h.status === "ok"
            ? "border-green-600/40 bg-green-500/10 text-green-700 dark:text-green-400"
            : "border-red-600/40 bg-red-500/10 text-red-700 dark:text-red-400"
        }`}
      >
        <span aria-hidden="true">{h.status === "ok" ? "🟢" : "🔴"}</span>
        {h.status === "ok" ? "All systems operational" : "Degraded"}
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {fields.map(([label, value]) => (
          <div key={label} className="rounded-card border border-border bg-surface-muted/60 p-3">
            <dt className="text-xs uppercase tracking-wide text-ink-muted">{label}</dt>
            <dd className="mt-1 font-mono text-sm font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function StatusPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Status</h1>
        <p className="max-w-2xl text-black/70 dark:text-white/70">
          Live operational status, read fresh on every request. The same data is served
          as JSON at{" "}
          <Link href="/api/health" className="underline underline-offset-2 hover:text-ink">
            <code>/api/health</code>
          </Link>{" "}
          — the endpoint an uptime monitor would poll (try{" "}
          <code>/api/health?simulate=unhealthy</code> for a 503).
        </p>
      </header>

      <Suspense
        fallback={<div className="h-32 animate-pulse rounded-card border border-border bg-black/5 dark:bg-white/10" />}
      >
        <HealthCards />
      </Suspense>
    </div>
  );
}
