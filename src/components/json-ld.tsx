// Day 10: render JSON-LD structured data as a <script type="application/ld+json">.
// This is how you describe entities (Organization, Article, Breadcrumbs) to search
// engines and AI for rich results. A plain <script> (not next/script) is correct —
// it's data, not executable code.
//
// We escape `<` to its unicode form to prevent XSS via injected HTML in the data
// (the sanitization the Next docs recommend for JSON.stringify).
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
