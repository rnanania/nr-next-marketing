"use server";
// Server Action backing the optimistic feedback wall (Day 4).
// Validates on the server, simulates a DB write (so the optimistic UI is
// visible), and returns the saved record. Throwing on invalid input lets the
// client's useActionState surface an error without a crash.

export type Feedback = { id: string; name: string; text: string };

export async function submitFeedback(formData: FormData): Promise<Feedback> {
  const name = (String(formData.get("name") ?? "").trim() || "Guest").slice(0, 40);
  const text = String(formData.get("text") ?? "").trim();

  if (!text) throw new Error("Message cannot be empty.");
  if (text.length > 280) throw new Error("Message too long (max 280).");

  // Simulate persistence latency (DB/CRM write) so the optimistic state shows.
  await new Promise((r) => setTimeout(r, 2000));

  return { id: crypto.randomUUID(), name, text };
}
