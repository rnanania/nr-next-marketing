import { getRemoteTodos } from "@/lib/remote";

// ROUTE HANDLER as a Backend-For-Frontend (BFF) proxy.
//
// A `route.ts` file defines HTTP handlers (GET/POST/…) using the Web Request/
// Response APIs. Here GET proxies a third-party API: the browser calls
// /api/todos and never sees the upstream URL or the Authorization key — those
// stay server-side in lib/remote.ts. This is the standard pattern for hiding
// secrets, reshaping payloads, and adding caching in front of a 3rd-party API.
//
// Caching model with Cache Components: a GET handler follows the same rules as a
// page. Because `getRemoteTodos` is `use cache`, this response is cacheable /
// prerenderable. (Note: `use cache` can't go in the handler body itself — it
// must live in a helper, which is exactly why getRemoteTodos exists.)
export async function GET() {
  const todos = await getRemoteTodos();
  return Response.json({
    source: "proxied via /api/todos (upstream URL + key hidden)",
    count: todos.length,
    todos,
  });
}
