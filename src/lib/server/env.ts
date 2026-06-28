import "server-only";
// `server-only` is a build-time guard: if any Client Component (a "use client"
// module) ever imports this file — directly or transitively — the build FAILS.
// That guarantees these values (API base URL, keys, webhook secret) never ship
// in the browser bundle. This is how you keep secrets server-side in Next.
//
// In real life these come from `.env.local` / your host's env vars. We provide
// safe fallbacks so the Day 3 demo runs with zero setup. The upstream we proxy
// (jsonplaceholder) needs no real key — the "key" here just shows the pattern.

export const apiConfig = {
  baseUrl: process.env.PLACEHOLDER_API_URL ?? "https://jsonplaceholder.typicode.com",
  apiKey: process.env.PLACEHOLDER_API_KEY ?? "demo-key-not-a-real-secret",
  // Shared secret a CMS webhook must present to trigger revalidation.
  webhookSecret: process.env.REVALIDATE_SECRET ?? "dev-secret",
};
