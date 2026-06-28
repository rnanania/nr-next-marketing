import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

// Day 11: exit Draft Mode — delete the draft cookie and return to published content.
export async function GET() {
  const draft = await draftMode();
  draft.disable();
  redirect("/landing");
}
