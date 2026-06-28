// A deliberately SLOW async Server Component to demonstrate STREAMING.
// It "fetches" for 2s. Wrapped in <Suspense>, its fallback shows instantly while
// the rest of the page renders; this content streams in when ready.
import { connection } from "next/server";

async function fetchHeadlines(): Promise<string[]> {
  await connection(); // defer to request time so it streams (a real dynamic hole)
  await new Promise((r) => setTimeout(r, 2000)); // simulate slow API
  return [
    "Acme launches new marketing CMS integration",
    "Core Web Vitals improve 30% after edge rollout",
    "Customers ship landing pages 2x faster",
  ];
}

export default async function SlowHeadlines() {
  const headlines = await fetchHeadlines();
  return (
    <ul className="space-y-2">
      {headlines.map((h) => (
        <li key={h} className="rounded border border-black/10 p-3 dark:border-white/15">
          {h}
        </li>
      ))}
    </ul>
  );
}
