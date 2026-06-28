import type { Block } from "@/lib/cms/schema";

type FeatureListProps = Extract<Block, { type: "featureList" }>;

export default function FeatureList({ title, items }: FeatureListProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <li
            key={item.name}
            className="rounded-lg border border-black/10 p-4 dark:border-white/15"
          >
            <p className="font-medium">{item.name}</p>
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">
              {item.description}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
