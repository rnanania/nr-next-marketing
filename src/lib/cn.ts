import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// cn() — the standard Tailwind class composer (also what shadcn/ui uses, Day 7).
//
// - clsx: conditionally join class names ("a", cond && "b", { c: isC }).
// - twMerge: resolve CONFLICTING Tailwind utilities so the LAST one wins
//   (e.g. cn("px-2", "px-4") → "px-4", not "px-2 px-4"). Without it, conflicting
//   classes both end up in the DOM and CSS source order decides — a common bug
//   when a base component class meets a prop override.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
