"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const DISMISSED = "install-hint-dismissed";

type Platform = "ios" | "android";

/**
 * How to put the app on a phone's home screen, for people who would not look
 * for it in a browser menu. Shown only on a phone, in the browser (not once
 * installed), until dismissed. Neither iOS nor every Android browser has an
 * install button a page can press for them.
 */
export function InstallHint() {
  // The server cannot know the device: it renders nothing, the browser decides.
  const platform = useSyncExternalStore(noChanges, detectPlatform, () => null);
  const [dismissed, setDismissed] = useState(false);
  if (!platform || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED, "1");
    } catch {
      // Private browsing may refuse storage: the hint then shows next time.
    }
  }

  return (
    <aside className="mt-6 flex flex-col gap-2 rounded-lg border p-4 text-sm">
      <p className="font-medium">Put the app on your home screen</p>
      <p className="text-muted-foreground">
        {platform === "ios"
          ? "In Safari, tap the Share button, then “Add to Home Screen”."
          : "Open the browser menu (⋮), then tap “Install app” or “Add to Home screen”."}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={dismiss}
      >
        Got it
      </Button>
    </aside>
  );
}

function noChanges() {
  return () => {};
}

/** The phone's system, or null when the hint has no use here. */
function detectPlatform(): Platform | null {
  const installed =
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari on iOS says it here instead.
    ("standalone" in navigator && navigator.standalone === true);
  if (installed || wasDismissed()) return null;
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) return "ios";
  if (/Android/.test(navigator.userAgent)) return "android";
  return null;
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED) === "1";
  } catch {
    return false;
  }
}
