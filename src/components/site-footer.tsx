// SERVER COMPONENT (no "use client") — static, ships zero JS to the browser.
// Under Cache Components, `new Date()` is non-deterministic, so we cache this
// component's output with `use cache`. The year is computed once and reused
// (refreshed daily) — it goes into the static shell instead of erroring.
import { cacheLife } from "next/cache";
import CookieSettingsButton from "@/components/cookie-settings-button";

export default async function SiteFooter() {
  "use cache";
  cacheLife("days");
  return (
    <footer className="mt-auto border-t border-black/10 dark:border-white/15">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-6 text-sm text-black/60 dark:text-white/60">
        <span>
          © {new Date().getFullYear()} Pace Inc. · Built with Next.js 16 (App Router).
        </span>
        {/* Client island inside a cached server component — withdrawing consent
            must be as easy as granting it (GDPR). */}
        <CookieSettingsButton />
      </div>
    </footer>
  );
}
