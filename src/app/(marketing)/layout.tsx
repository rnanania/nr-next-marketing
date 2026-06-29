// Route-group layout. The folder name "(marketing)" is wrapped in parentheses,
// so it groups these routes under a shared layout WITHOUT adding "/marketing"
// to the URL. The root layout (html/body/fonts) still wraps this one.
//
// Note the composition: SiteHeader is a Client Component island, but it's
// rendered here inside a Server Component layout. The server renders the shell;
// only the header's interactive bits hydrate on the client.

import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import StudyNote from "@/components/study-note";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      {/* id="main" is the skip-link target; tabIndex=-1 lets focus move here
          programmatically; scroll-mt keeps the heading clear of a sticky header. */}
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 scroll-mt-4 px-6 py-12 outline-none"
      >
        {children}
        {/* UI teaching layer: a per-route "what you're learning here" note, so the
            live site doubles as a walkthrough of docs/study_plan.md. */}
        <StudyNote />
      </main>
      <SiteFooter />
    </>
  );
}
