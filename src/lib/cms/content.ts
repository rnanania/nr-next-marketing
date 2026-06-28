import "server-only";
import type { z } from "zod";

// Day 5: validate untrusted data at the boundary, then trust the types inside.
//
// A GENERIC validation wrapper: give it a zod schema and raw `unknown` data, get
// back a fully-typed, runtime-checked value (or a thrown error with a clear
// message). `<S extends z.ZodType>` ties the return type to the schema, so the
// result is `z.infer<S>` — no casts, no `any`.
//
// Day 11: the landing-page loader moved to ./contentful (it now sources from the
// Contentful Delivery/Preview API and maps the response through this validator).
export function validate<S extends z.ZodType>(
  schema: S,
  data: unknown,
  context = "payload",
): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    // In real life: log result.error.issues to observability (Day 15).
    throw new Error(`Invalid ${context}: ${result.error.issues[0]?.message ?? "unknown"}`);
  }
  return result.data;
}
