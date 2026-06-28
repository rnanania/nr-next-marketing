import type { Block } from "@/lib/cms/schema";
import Hero from "@/components/blocks/hero";
import FeatureList from "@/components/blocks/feature-list";
import Cta from "@/components/blocks/cta";
import RichText from "@/components/blocks/rich-text";

// The generic <Section> renderer — resolves a typed block to its component.
//
// The switch is EXHAUSTIVE over the discriminated union. In each case, TypeScript
// has narrowed `block` to that member, so `block.heading` etc. are type-checked.
// The `default` branch assigns `block` to `never`: if someone adds a new block
// type to the schema but forgets a case here, this stops compiling. That's the
// payoff of discriminated unions — the compiler enforces completeness.
function assertNever(x: never): never {
  throw new Error(`Unhandled block type: ${JSON.stringify(x)}`);
}

export function Section({ block }: { block: Block }) {
  switch (block.type) {
    case "hero":
      return <Hero {...block} />;
    case "featureList":
      return <FeatureList {...block} />;
    case "cta":
      return <Cta {...block} />;
    case "richText":
      return <RichText {...block} />;
    default:
      return assertNever(block); // compile error if a case is missing
  }
}

export default function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-8">
      {blocks.map((block) => (
        <Section key={block.id} block={block} />
      ))}
    </div>
  );
}
