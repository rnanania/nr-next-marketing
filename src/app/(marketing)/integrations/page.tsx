// Day 3 demo page — third-party data + on-demand revalidation.
//
// `getSnapshot` is `use cache` + cacheTag("todos"), so the upstream todos AND the
// generatedAt stamp are frozen into the static shell. They only change when the
// "todos" tag is revalidated — either by the button below (Server Action) or by
// the webhook Route Handler (POST /api/revalidate?tag=todos). Reload all you
// want: the stamp stays put until you revalidate. That's the CMS pattern.

import { cacheLife, cacheTag } from "next/cache";
import { getRemoteTodos } from "@/lib/remote";
import RefreshButton from "@/components/refresh-button";

export const metadata = {
  title: "Integrations — Pace",
  description: "Third-party API proxied + cached, with tag-based revalidation.",
};

async function getSnapshot() {
  "use cache";
  cacheLife("hours");
  cacheTag("todos");
  const todos = await getRemoteTodos();
  return { todos, generatedAt: new Date().toISOString() };
}

export default async function IntegrationsPage() {
  const { todos, generatedAt } = await getSnapshot();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
      <p className="text-sm text-black/60 dark:text-white/60">
        Cached upstream snapshot generated at <code>{generatedAt}</code>. The
        upstream URL + API key stay server-side. Reload: the stamp is stable.
        Click below (or POST the webhook) to revalidate the <code>todos</code> tag.
      </p>

      <RefreshButton />

      <ul className="grid gap-3 sm:grid-cols-2">
        {todos.map((t) => (
          <li
            key={t.id}
            className="rounded-lg border border-black/10 p-4 dark:border-white/15"
          >
            <p className="font-medium">#{t.id} — {t.title}</p>
            <p className="text-sm text-black/60 dark:text-white/60">
              {t.completed ? "✅ completed" : "⏳ open"}
            </p>
          </li>
        ))}
      </ul>

      <p className="text-sm text-black/60 dark:text-white/60">
        The same data is also exposed as a JSON proxy at{" "}
        <a href="/api/todos" className="text-brand-600 dark:text-brand-300 underline">
          /api/todos
        </a>{" "}
        (a Route Handler / BFF endpoint).
      </p>
    </div>
  );
}
