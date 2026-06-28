"use client";
// CLIENT COMPONENT — a small "island" of interactivity inside an otherwise
// server-rendered layout. It needs useState for the mobile menu toggle, so it
// must run in the browser. This is the only interactive piece of the header.

import Link from "next/link";
import { useState } from "react";
import ThemeToggle from "@/components/theme-toggle";

const nav = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/deals", label: "Deals" },
  { href: "/news", label: "News" },
  { href: "/features", label: "Features" },
  { href: "/showcase", label: "Showcase" },
  { href: "/campaign", label: "Campaign" },
  { href: "/design-system", label: "Design System" },
  { href: "/landing", label: "Landing" },
  { href: "/integrations", label: "Integrations" },
  { href: "/subscribe", label: "Subscribe" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-black/10 dark:border-white/15">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Pace<span className="text-brand-600 dark:text-brand-300">.</span>
        </Link>

        {/* Desktop nav — only at lg+, where the row fits. Below that we use the
            hamburger menu (11 links would overflow a tablet width otherwise). */}
        <nav aria-label="Primary" className="hidden items-center gap-x-4 lg:flex xl:gap-x-6">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className="whitespace-nowrap text-sm text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {/* Hamburger toggle — shown below lg (mobile + tablet) */}
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
            className="rounded border border-black/45 px-3 py-1 text-sm lg:hidden dark:border-white/35"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {/* Mobile/tablet nav — collapses the same links into a vertical list */}
      {open && (
        <nav aria-label="Primary" id="mobile-nav" className="flex flex-col gap-1 px-6 pb-4 lg:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onClick={() => setOpen(false)}
              className="rounded px-2 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
