// Static Server Component → "/about".
import Link from "next/link";

const LINKEDIN_URL = "https://www.linkedin.com/in/rohit-nanania-a05366b/";

export const metadata = {
  title: "About — Pace",
  description:
    "Pace is a hands-on Next.js 16 study project by Rohit Nanania — a senior front-end engineer experimenting with the modern App Router stack.",
};

export default function AboutPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">About</h1>
        <p className="max-w-2xl text-black/70 dark:text-white/70">
          Pace is a demo company used to practice the Next.js 16 App Router. This
          page is a plain Server Component — no JavaScript is shipped to the
          browser for it.
        </p>
      </header>

      <section className="max-w-2xl space-y-4 rounded-card border border-border bg-surface-muted/60 p-6">
        <h2 className="text-xl font-semibold tracking-tight">Hi, I&apos;m Rohit 👋</h2>
        <p className="text-black/70 dark:text-white/70">
          I&apos;m a senior front-end engineer, and this site is my hands-on lab for
          mastering the modern Next.js stack end to end. Rather than read about
          features, I build <strong>real, runnable</strong> versions of them into this
          one app — then write up what I learned.
        </p>
        <p className="text-black/70 dark:text-white/70">
          What I&apos;m experimenting with here: the <strong>Next.js 16 App Router</strong>{" "}
          (Server Components, PPR &amp; Cache Components, streaming), <strong>React 19</strong>{" "}
          (the React Compiler, Actions, optimistic UI), <strong>Tailwind v4</strong> with a
          token-driven design system, <strong>Contentful</strong> as a headless CMS, and the
          marketing layer — <strong>GTM, consent &amp; Consent Mode, Marketo lead capture,
          UTM attribution, A/B testing</strong>, plus SEO, accessibility, and Core Web
          Vitals. Each page carries a study note at the bottom explaining which piece
          it demonstrates.
        </p>
        <p className="text-black/70 dark:text-white/70">
          Want the story behind any of it, or to connect?
        </p>
        <Link
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Connect on LinkedIn
          <span aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  );
}
