import type { Block } from "@/lib/cms/schema";

type RichTextProps = Extract<Block, { type: "richText" }>;

export default function RichText({ body }: RichTextProps) {
  return (
    <section className="prose max-w-none">
      <p className="text-black/70 dark:text-white/70">{body}</p>
    </section>
  );
}
