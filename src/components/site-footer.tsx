// SERVER COMPONENT (no "use client") — static, ships zero JS to the browser.
// Under Cache Components, `new Date()` is non-deterministic, so we cache this
// component's output with `use cache`. The year is computed once and reused
// (refreshed daily) — it goes into the static shell instead of erroring.
import { cacheLife } from "next/cache";

export default async function SiteFooter() {
  "use cache";
  cacheLife("days");
  return (
    <footer className="mt-auto border-t border-black/10 dark:border-white/15">
      <div className="mx-auto max-w-5xl px-6 py-6 text-sm text-black/60 dark:text-white/60">
        © {new Date().getFullYear()} Pace Inc. · Built with Next.js 16 (App Router).
      </div>
    </footer>
  );
}
