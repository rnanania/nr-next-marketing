"use client";
// The UI teaching layer. Rendered once at the bottom of the shared (marketing)
// layout, it looks up the current route in STUDY_NOTES and shows a short "what
// you're learning here" callout — turning the live site into a self-guided tour of
// docs/study_plan.md. Returns null on routes that have no note.
//
// usePathname() is safe in statically prerendered pages (unlike useSearchParams it
// does NOT opt the route into dynamic rendering), so this adds no perf cost.

import { usePathname } from "next/navigation";
import { getStudyNote } from "@/lib/study-notes";

export default function StudyNote() {
  const note = getStudyNote(usePathname());
  if (!note) return null;

  return (
    <aside
      aria-label="Study note"
      className="mt-16 rounded-card border border-border border-dashed bg-surface-muted/60 px-5 py-4"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300">
        📚 Study plan · {note.days}
      </p>
      <h2 className="mt-1 text-base font-semibold text-ink">{note.title}</h2>
      <p className="mt-1 text-sm text-ink-muted">{note.summary}</p>
    </aside>
  );
}
