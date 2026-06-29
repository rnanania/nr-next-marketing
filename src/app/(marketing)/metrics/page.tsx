// Day 9 — a PUBLIC live Core Web Vitals page. Static Server Component shell + a
// client island (<WebVitalsLive>) that measures the current visitor's real metrics
// via next/web-vitals. Self-hosted and public, unlike the private Vercel Speed
// Insights dashboard.

import WebVitalsLive from "@/components/web-vitals-live";

export const metadata = {
  title: "Live Web Vitals — Pace",
  description:
    "Real-user Core Web Vitals (LCP, INP, CLS, FCP, TTFB) measured live in your browser — a public, self-hosted alternative to a private analytics dashboard.",
};

export default function MetricsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Live Web Vitals</h1>
        <p className="max-w-2xl text-black/70 dark:text-white/70">
          These are <strong>your</strong> real Core Web Vitals, measured right now in your
          browser as you use this page — not a lab score. Self-hosted with Next.js&apos;s{" "}
          <code className="rounded bg-black/5 px-1 py-0.5 text-sm dark:bg-white/10">useReportWebVitals</code>,
          so anyone can see them (no private dashboard required).
        </p>
      </header>

      <WebVitalsLive />

      <section className="max-w-2xl space-y-2 text-sm text-ink-muted">
        <p>
          <strong>How to read this:</strong> LCP, FCP and TTFB are captured as the page
          loads. <strong>CLS</strong> updates if anything shifts, and{" "}
          <strong>INP</strong> appears once you click, tap, or type — interact with the
          page to measure it.
        </p>
        <p>
          Good thresholds: LCP ≤ 2.5s · INP ≤ 200ms · CLS ≤ 0.1 · FCP ≤ 1.8s · TTFB ≤ 0.8s.
          Values reflect this single visit; aggregate field data still lives in Vercel
          Speed Insights.
        </p>
      </section>
    </div>
  );
}
