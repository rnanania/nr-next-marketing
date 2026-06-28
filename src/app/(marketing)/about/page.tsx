// Static Server Component → "/about".

export const metadata = {
  title: "About — Acme",
  description: "Who we are.",
};

export default function AboutPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">About</h1>
      <p className="max-w-2xl text-black/70 dark:text-white/70">
        Acme is a demo company used to practice the Next.js 16 App Router. This
        page is a plain Server Component — no JavaScript is shipped to the
        browser for it.
      </p>
    </div>
  );
}
