// Day 4 demo page — React 19 advanced + performance.
//
// The page is a Server Component (static shell). It composes two client islands:
//   - <FeatureGrid>   — filterable card grid (useDeferredValue, no manual memo)
//   - <FeedbackWall>  — optimistic mutation form (useActionState + useOptimistic)
//
// It also demonstrates React 19 NATIVE DOCUMENT METADATA: the <meta> tag below is
// rendered in the component body, and React hoists it into <head> automatically.
// (Next's Metadata API still owns <title>/description; this just proves hoisting.)

import FeatureGrid from "@/components/feature-grid";
import FeedbackWall from "@/components/feedback-wall";
import type { Feedback } from "@/lib/feedback-actions";

export const metadata = {
  title: "Features — Pace",
  description: "Filterable features + an optimistic feedback wall (React 19).",
};

const seedFeedback: Feedback[] = [
  { id: "seed-1", name: "Dana", text: "The new landing pages ship twice as fast." },
  { id: "seed-2", name: "Priya", text: "Core Web Vitals went green after the rollout." },
];

export default function FeaturesPage() {
  return (
    <div className="space-y-10">
      {/* React 19 hoists this into <head> from anywhere in the tree. */}
      <meta name="x-demo" content="react-19-metadata-hoisting" />

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Features</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Type to filter — the input stays responsive (<code>useDeferredValue</code>),
          and there are no manual <code>useMemo</code> calls (React Compiler).
        </p>
      </div>
      <FeatureGrid />

      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">What customers say</h2>
        <p className="text-sm text-black/60 dark:text-white/60">
          Posting shows your message instantly (<code>useOptimistic</code>) before
          the server confirms (<code>useActionState</code>).
        </p>
      </div>
      <FeedbackWall initial={seedFeedback} />
    </div>
  );
}
