"use client";
// Runtime theme switching. The source of truth is the `.dark` class on <html>
// (set by the no-flash script in the root layout before first paint). Rather than
// mirror that into React state with an effect (which triggers cascading renders),
// we READ it with useSyncExternalStore — the right tool for subscribing to an
// external system (here, a DOM attribute). The toggle mutates the class +
// localStorage; a MutationObserver notifies the store, which re-renders the label.

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

type Theme = "light" | "dark";

// Subscribe to changes of the <html> class attribute.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

// On the server there's no DOM; default to light (the no-flash script corrects
// it on the client before paint).
function getServerSnapshot(): Theme {
  return "light";
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
    // No setState: the class change fires the MutationObserver, which re-renders.
  }

  return (
    <button
      type="button"
      onClick={toggle}
      // The label depends on a value that legitimately differs between the server
      // default and the client's real theme — suppress the hydration warning.
      suppressHydrationWarning
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={cn(
        "rounded border px-2.5 py-1 text-sm transition-colors",
        "border-black/45 hover:bg-black/5 dark:border-white/35 dark:hover:bg-white/10",
      )}
    >
      {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
    </button>
  );
}
