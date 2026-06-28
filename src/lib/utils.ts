// shadcn/ui imports `cn` from "@/lib/utils" by convention. We already authored
// `cn` on Day 6 (clsx + tailwind-merge) in ./cn — re-export it here so there's a
// single implementation shared by both the shadcn components and our own code.
export { cn } from "./cn";
