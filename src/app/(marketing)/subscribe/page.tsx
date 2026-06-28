// Day 3 demo page — mutations via a Server Action + form.
//
// The page itself is a static shell (heading/copy are prerendered). The form is a
// small Client island (<SubscribeForm>) wired to the `subscribe` Server Action,
// which validates on the server and returns a result the form renders inline.

import SubscribeForm from "@/components/subscribe-form";

export const metadata = {
  title: "Subscribe — Acme",
  description: "Newsletter signup powered by a Server Action.",
};

export default function SubscribePage() {
  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Subscribe</h1>
      <p className="text-sm text-black/60 dark:text-white/60">
        Get product updates. Submitting calls a <strong>Server Action</strong> —
        validated on the server, no client-side API route required.
      </p>
      <SubscribeForm />
    </div>
  );
}
