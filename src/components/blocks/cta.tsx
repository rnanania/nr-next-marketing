import Link from "next/link";
import type { Block } from "@/lib/cms/schema";

type CtaProps = Extract<Block, { type: "cta" }>;

// `variant` is a string-literal union ("primary" | "secondary") — a Record maps
// each variant to its classes, so adding a variant to the schema forces you to
// handle it here (exhaustive Record key).
const VARIANT_CLASSES: Record<CtaProps["variant"], string> = {
  primary: "bg-blue-600 text-white",
  secondary: "border border-black/45 dark:border-white/35",
};

export default function Cta({ text, href, variant }: CtaProps) {
  return (
    <section className="rounded-xl border border-black/10 p-6 text-center dark:border-white/15">
      <Link
        href={href}
        className={`inline-block rounded px-5 py-2.5 text-sm font-medium ${VARIANT_CLASSES[variant]}`}
      >
        {text}
      </Link>
    </section>
  );
}
