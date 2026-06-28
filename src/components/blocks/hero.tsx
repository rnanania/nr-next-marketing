import Link from "next/link";
import type { Block } from "@/lib/cms/schema";

// `Extract<Block, { type: "hero" }>` narrows the union to just the hero member,
// so this component's props are exactly that block's fields — no re-typing.
type HeroProps = Extract<Block, { type: "hero" }>;

export default function Hero({ heading, subheading, ctaLabel, ctaHref }: HeroProps) {
  return (
    <section className="space-y-3 rounded-xl border border-black/10 p-8 dark:border-white/15">
      <h2 className="text-3xl font-bold tracking-tight">{heading}</h2>
      {subheading ? (
        <p className="text-black/60 dark:text-white/60">{subheading}</p>
      ) : null}
      {ctaLabel && ctaHref ? (
        <Link
          href={ctaHref}
          className="inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </section>
  );
}
