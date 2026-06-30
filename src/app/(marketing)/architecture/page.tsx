// Day 14 — Cloud Computing Fundamentals, made concrete for THIS site.
// A mostly-static page that documents how the marketing site is hosted + cached and
// maps each layer to AWS / Azure / GCP equivalents (the JD's "host & scale this on
// AWS" question). One dynamic hole proves the edge layer is real: it reads Vercel's
// request-time geo headers to show which edge PoP geolocated your request. Because
// headers() is a request-time API, that island lives in <Suspense> (PPR, Day 2).

import { Suspense } from "react";
import { headers } from "next/headers";

export const metadata = {
  title: "Architecture — Pace",
  description:
    "How this Next.js marketing site is hosted, cached, and scaled — mapped to AWS / Azure / GCP cloud primitives (Day 14).",
};

// Build-time deployment metadata (Vercel injects these; undefined locally).
const env = process.env.VERCEL_ENV ?? "local";
const commit = (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7) || "—";
const buildRegion = process.env.VERCEL_REGION ?? "—";

const requestPath = `  Visitor
    │   DNS  (Vercel DNS  ·  AWS Route 53)
    ▼
  CDN / Edge PoP  ───────────────►  cache HIT  →  static HTML in ~ms (no compute)
  (Vercel Edge · CloudFront)            │ cache MISS
    │  edge proxy.ts: A/B + UTM         ▼
    ▼                            Serverless function (a region)
  Static shell (SSG / PPR)  +  ──►  RSC render · Server Actions · route handlers
  dynamic holes, edge-cached        · ISR regeneration
                                          │
                                          ▼
                                  Data: Contentful, 3rd-party APIs
                                  Secrets: server-only env / Secrets Manager`;

const cloudRows: [string, string, string, string, string][] = [
  ["Static hosting + CDN", "Vercel Edge Network", "S3 + CloudFront", "Blob + Front Door", "Cloud Storage + Cloud CDN"],
  ["Serverless compute", "Vercel Functions", "Lambda", "Azure Functions", "Cloud Run / Functions"],
  ["Edge compute", "Edge proxy (proxy.ts)", "Lambda@Edge / CF Functions", "Front Door Rules", "Cloud Functions (edge)"],
  ["DNS", "Vercel DNS", "Route 53", "Azure DNS", "Cloud DNS"],
  ["TLS / certificates", "Automatic", "ACM", "App Service Certs", "Google-managed certs"],
  ["Secrets / config", "Project env vars", "Secrets Manager / SSM", "Key Vault", "Secret Manager"],
  ["Identity / access", "Vercel team roles", "IAM", "Entra ID / RBAC", "Cloud IAM"],
  ["Observability", "Analytics / Logs", "CloudWatch", "Azure Monitor", "Cloud Monitoring"],
];

// Dynamic hole — proves the edge layer is real (request-time geo headers).
async function EdgeInfo() {
  const h = await headers();
  const country = h.get("x-vercel-ip-country");
  const city = h.get("x-vercel-ip-city");
  const region = h.get("x-vercel-ip-country-region");
  const tz = h.get("x-vercel-ip-timezone");
  const onEdge = Boolean(country);

  return (
    <section className="rounded-card border border-brand-600/30 bg-brand-500/5 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300">
        📍 Edge layer — live
      </h2>
      {onEdge ? (
        <p className="mt-2 text-sm text-ink-muted">
          Vercel&apos;s edge geolocated this request to{" "}
          <strong className="text-ink">
            {[city ? decodeURIComponent(city) : null, region, country].filter(Boolean).join(", ")}
          </strong>
          {tz ? ` (timezone ${tz})` : null}. That&apos;s the CDN point-of-presence nearest
          you serving the static shell; dynamic holes run in the function region.
        </p>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">
          Running locally — no edge geo headers. Deployed on Vercel, this reads the
          request-time <code>x-vercel-ip-*</code> headers to show the CDN edge location
          nearest you (the same primitive as CloudFront&apos;s edge PoPs).
        </p>
      )}
    </section>
  );
}

export default function ArchitecturePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Architecture & Hosting</h1>
        <p className="max-w-2xl text-black/70 dark:text-white/70">
          How this marketing site is hosted, cached, and scaled — and how each layer
          maps to <strong>AWS / Azure / GCP</strong>. The whole stack is{" "}
          <strong>static-first</strong>: the CDN absorbs traffic spikes (campaign
          launches) and only cache misses ever touch compute.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Request path</h2>
        <pre className="overflow-x-auto rounded-card border border-border bg-surface-muted/60 p-4 text-xs leading-relaxed">
          {requestPath}
        </pre>
      </section>

      {/* Dynamic hole (PPR): request-time edge geo. */}
      <Suspense
        fallback={
          <div className="h-24 animate-pulse rounded-card border border-border bg-black/5 dark:bg-white/10" />
        }
      >
        <EdgeInfo />
      </Suspense>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Cloud primitive equivalents</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-4 font-semibold">Concern</th>
                <th className="py-2 pr-4 font-semibold">This app (Vercel)</th>
                <th className="py-2 pr-4 font-semibold">AWS</th>
                <th className="py-2 pr-4 font-semibold">Azure</th>
                <th className="py-2 font-semibold">GCP</th>
              </tr>
            </thead>
            <tbody>
              {cloudRows.map(([concern, vercel, aws, azure, gcp]) => (
                <tr key={concern} className="border-b border-border/60">
                  <td className="py-2 pr-4 font-medium">{concern}</td>
                  <td className="py-2 pr-4 text-ink-muted">{vercel}</td>
                  <td className="py-2 pr-4 text-ink-muted">{aws}</td>
                  <td className="py-2 pr-4 text-ink-muted">{azure}</td>
                  <td className="py-2 text-ink-muted">{gcp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="max-w-2xl space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">How this site maps</h2>
        <ul className="space-y-1.5 text-sm text-black/70 dark:text-white/70">
          <li>• <strong>Static pages</strong> (/, /pricing, /about) → prerendered HTML cached at the edge, like S3 objects behind CloudFront. Near-zero compute, scales infinitely.</li>
          <li>• <strong>ISR / PPR</strong> (/deals, /news, /campaign) → static shell at the edge + serverless regeneration/holes — CloudFront caching + Lambda revalidation.</li>
          <li>• <strong>Server Actions & route handlers</strong> (/subscribe, /api/*) → serverless functions (AWS Lambda).</li>
          <li>• <strong>Edge proxy</strong> (proxy.ts: A/B + UTM) → runs at the CDN edge before render (Lambda@Edge / CloudFront Functions).</li>
          <li>• <strong>Images</strong> (next/image) → on-the-fly optimization, then CDN-cached (an image CDN).</li>
          <li>• <strong>Secrets</strong> (Marketo / Contentful tokens) → server-only env vars, never in the client bundle. On AWS: Secrets Manager / SSM Parameter Store.</li>
        </ul>
      </section>

      <section className="max-w-2xl space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">This deployment</h2>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-card border border-border bg-surface-muted/60 p-3">
            <dt className="text-xs uppercase tracking-wide text-ink-muted">Environment</dt>
            <dd className="mt-1 font-mono font-semibold">{env}</dd>
          </div>
          <div className="rounded-card border border-border bg-surface-muted/60 p-3">
            <dt className="text-xs uppercase tracking-wide text-ink-muted">Commit</dt>
            <dd className="mt-1 font-mono font-semibold">{commit}</dd>
          </div>
          <div className="rounded-card border border-border bg-surface-muted/60 p-3">
            <dt className="text-xs uppercase tracking-wide text-ink-muted">Build region</dt>
            <dd className="mt-1 font-mono font-semibold">{buildRegion}</dd>
          </div>
        </dl>
        <p className="text-xs text-ink-muted">
          These come from Vercel system env vars at build time (<code>VERCEL_ENV</code>,{" "}
          <code>VERCEL_GIT_COMMIT_SHA</code>, <code>VERCEL_REGION</code>); they show
          &ldquo;—&rdquo; / &ldquo;local&rdquo; in local dev. On AWS the equivalents are
          IAM-scoped build metadata + the Lambda region.
        </p>
      </section>
    </div>
  );
}
