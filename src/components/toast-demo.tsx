"use client";
// Toasts need a click handler, so this is a small client island. `toast` is the
// imperative sonner API; the <Toaster/> rendered in the root layout displays them.

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => toast.success("Saved", { description: "Your changes are live." })}>
        Success toast
      </Button>
      <Button variant="outline" onClick={() => toast.error("Something broke", { description: "Try again." })}>
        Error toast
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.promise(new Promise((r) => setTimeout(r, 1200)), {
            loading: "Publishing…",
            success: "Published!",
            error: "Failed",
          })
        }
      >
        Promise toast
      </Button>
    </div>
  );
}
