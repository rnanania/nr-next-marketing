"use client";
// CLIENT COMPONENT — a small "island" of interactivity inside an otherwise
// server-rendered layout. It needs useState for the mobile menu toggle, so it
// must run in the browser.
//
// The site has many demo pages, so the top nav keeps a curated set of PRIMARY
// links and tucks the feature-showcase pages into a "Demos" dropdown — keeps the
// bar uncluttered while staying fully accessible (Radix dropdown).

import Link from "next/link";
import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import ThemeToggle from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const primaryNav = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/features", label: "Features" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
];

// Feature-showcase / demo pages, grouped under "Demos".
const demoNav = [
  { href: "/deals", label: "Deals" },
  { href: "/news", label: "News" },
  { href: "/showcase", label: "Showcase" },
  { href: "/campaign", label: "Campaign" },
  { href: "/design-system", label: "Design System" },
  { href: "/landing", label: "Landing" },
  { href: "/integrations", label: "Integrations" },
  { href: "/subscribe", label: "Subscribe" },
  { href: "/metrics", label: "Live Web Vitals" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-black/10 dark:border-white/15">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Pace<span className="text-brand-600 dark:text-brand-300">.</span>
        </Link>

        {/* Desktop nav (lg+): primary links + a Demos dropdown. */}
        <nav aria-label="Primary" className="hidden items-center gap-x-5 lg:flex">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className="whitespace-nowrap text-sm text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white"
            >
              {item.label}
            </Link>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-black/70 outline-none hover:text-black data-[state=open]:text-black dark:text-white/70 dark:hover:text-white dark:data-[state=open]:text-white">
              Demos
              <ChevronDownIcon className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Feature demos</DropdownMenuLabel>
              {demoNav.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href} prefetch>
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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

      {/* Mobile/tablet nav — flat list, grouped with a Demos heading. */}
      {open && (
        <nav
          aria-label="Primary"
          id="mobile-nav"
          className="flex flex-col gap-1 px-6 pb-4 lg:hidden"
        >
          {primaryNav.map((item) => (
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
          <p className="mt-2 px-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
            Demos
          </p>
          {demoNav.map((item) => (
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
