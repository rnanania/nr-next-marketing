import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { apiConfig } from "./server/env";

// Day 3: integrating a third-party REST API the right way.
//
// - A typed `fetch` wrapper (`apiFetch`) with a timeout, error handling, and a
//   single retry — the kind of resilient client you'd put in front of any
//   external API. The Authorization header (secret) is added here, server-side.
// - `getRemoteTodos` wraps the fetch in `use cache` + `cacheTag("todos")`, so the
//   result is cached (goes into the static shell) and can be invalidated
//   on-demand by tag (see the Server Action and the webhook Route Handler).

export type RemoteTodo = { id: number; title: string; completed: boolean };

// Generic typed fetch wrapper: timeout + one retry + non-2xx → throw.
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${apiConfig.baseUrl}${path}`;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: {
          // Secret added server-side — never exposed to the browser.
          Authorization: `Bearer ${apiConfig.apiKey}`,
          ...init?.headers,
        },
        // Abort a hung upstream so we don't block rendering forever.
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`Upstream ${url} responded ${res.status}`);
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      // Retry once on the first failure; rethrow on the second.
      if (attempt === 2) break;
    }
  }
  throw new Error(
    `apiFetch failed for ${path}: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
  );
}

// Cached + tagged accessor for the upstream "todos".
// `use cache` → result is cached and prerenderable (static shell).
// `cacheTag("todos")` → a Server Action or webhook can revalidate it on demand.
export async function getRemoteTodos(): Promise<RemoteTodo[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("todos");
  return apiFetch<RemoteTodo[]>("/todos?_limit=5");
}
