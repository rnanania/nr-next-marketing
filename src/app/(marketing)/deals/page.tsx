// ISR via the modern Cache Components model.
// `use cache` + cacheLife makes getDeals' output cached and time-revalidated.
// Everyone gets fast cached HTML; after `revalidate` seconds the next request
// triggers a background refresh (stale-while-revalidate). The cached timestamp
// is shared by all users until it revalidates — exactly the ISR behavior.
//
// This is the pattern for CMS-driven marketing pages: static speed + fresh content
// without a redeploy.

import { cacheLife } from "next/cache";

export const metadata = {
  title: "Deals — Acme",
  description: "Limited-time offers (cached, revalidates periodically).",
};

async function getDeals() {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 3600 }); // refresh ~every 60s
  // Pretend this is a CMS/API call. We stamp it with the time it was generated
  // so you can SEE when the cached HTML was (re)built.
  const generatedAt = new Date().toISOString();
  return {
    generatedAt,
    deals: [
      { name: "Starter", off: "20%" },
      { name: "Pro", off: "30%" },
      { name: "Scale", off: "40%" },
    ],
  };
}

export default async function DealsPage() {
  const { generatedAt, deals } = await getDeals();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Deals</h1>
      <p className="text-sm text-black/60 dark:text-white/60">
        Page generated at <code>{generatedAt}</code> · cached, revalidates ~every 60s.
        Refresh repeatedly: the timestamp stays the same until it revalidates, then updates.
      </p>
      <ul className="grid gap-4 sm:grid-cols-3">
        {deals.map((d) => (
          <li key={d.name} className="rounded-lg border border-black/10 p-4 dark:border-white/15">
            <p className="font-medium">{d.name}</p>
            <p className="text-2xl font-bold text-brand-600 dark:text-brand-300">{d.off} off</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
