"use client";
// Day 9: a TRUE lazy boundary for the heavy form.
//
// dynamic(..., { ssr: false }) means the form's chunk (react-hook-form + zod +
// resolvers, ~300KB) is NOT server-rendered and NOT preloaded — it downloads on
// the client AFTER hydration, so it's off the critical path. A skeleton reserves
// the space (no layout shift / CLS). `ssr: false` is only allowed inside a Client
// Component, which is why this thin wrapper exists (the page is a Server Component).

import dynamic from "next/dynamic";

const ContactForm = dynamic(() => import("@/components/contact-form"), {
  ssr: false,
  loading: () => (
    <div className="h-48 max-w-md animate-pulse rounded-md bg-black/5 dark:bg-white/10" />
  ),
});

export default function LazyContactForm() {
  return <ContactForm />;
}
