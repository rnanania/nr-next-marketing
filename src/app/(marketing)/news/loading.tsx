// Route-level loading UI. Next automatically wraps the page in a <Suspense>
// boundary using this as the fallback. It shows during navigation to /news
// while the server works — the "instant feedback" you get for free.

export default function NewsLoading() {
  return (
    <div className="space-y-4">
      <div className="h-9 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="h-24 w-full animate-pulse rounded bg-black/10 dark:bg-white/10" />
    </div>
  );
}
