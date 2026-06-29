"use client";
// Day 9 — a PUBLIC, self-hosted Core Web Vitals readout. Unlike the Vercel Speed
// Insights dashboard (private, behind auth), this shows the CURRENT visitor's real
// measurements right on the page, owned by us and visible to anyone.
//
// next/web-vitals' useReportWebVitals fires our callback as each metric becomes
// available. We keep the metrics in a small module-level external store and read it
// via useSyncExternalStore (the repo convention — no effect-then-setState), which
// also keeps the hook's callback reference STABLE (the docs require that to avoid
// duplicate reporting).

import { useReportWebVitals } from "next/web-vitals";
import { useSyncExternalStore } from "react";

type Rating = "good" | "needs-improvement" | "poor";
type Metric = { value: number; rating: Rating };
type Snapshot = Record<string, Metric>;

// --- external store -----------------------------------------------------------
let snapshot: Snapshot = {};
const emptySnapshot: Snapshot = {};
const listeners = new Set<() => void>();

function addMetric(metric: { name: string; value: number; rating: Rating }) {
  // New object reference so useSyncExternalStore detects the change.
  snapshot = { ...snapshot, [metric.name]: { value: metric.value, rating: metric.rating } };
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
const getSnapshot = () => snapshot;
const getServerSnapshot = () => emptySnapshot; // nothing measured on the server

// --- display config -----------------------------------------------------------
const VITALS = [
  { key: "LCP", label: "Largest Contentful Paint", help: "loading", unit: "s" },
  { key: "INP", label: "Interaction to Next Paint", help: "responsiveness", unit: "ms" },
  { key: "CLS", label: "Cumulative Layout Shift", help: "visual stability", unit: "" },
  { key: "FCP", label: "First Contentful Paint", help: "first paint", unit: "s" },
  { key: "TTFB", label: "Time to First Byte", help: "server response", unit: "s" },
] as const;

function formatValue(key: string, unit: string, value: number): string {
  if (key === "CLS") return value.toFixed(3);
  if (unit === "s") return `${(value / 1000).toFixed(2)} s`;
  return `${Math.round(value)} ms`;
}

const ratingStyles: Record<Rating, string> = {
  good: "border-green-600/40 bg-green-500/10 text-green-700 dark:text-green-400",
  "needs-improvement": "border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  poor: "border-red-600/40 bg-red-500/10 text-red-700 dark:text-red-400",
};
const ratingLabel: Record<Rating, string> = {
  good: "Good",
  "needs-improvement": "Needs improvement",
  poor: "Poor",
};

export default function WebVitalsLive() {
  useReportWebVitals(addMetric);
  const data = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {VITALS.map(({ key, label, help, unit }) => {
        const metric = data[key];
        const measured = metric !== undefined;
        return (
          <div
            key={key}
            className={`rounded-card border p-4 ${
              measured ? ratingStyles[metric.rating] : "border-border bg-surface-muted/60 text-ink-muted"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">{key}</span>
              <span className="text-xs opacity-80">{help}</span>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums" aria-live="polite">
              {measured ? formatValue(key, unit, metric.value) : "measuring…"}
            </p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-xs">{label}</span>
              {measured ? (
                <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium">
                  {ratingLabel[metric.rating]}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
