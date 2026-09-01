"use client";

import { useEffect, useState } from "react";
import { X, MousePointerClick } from "lucide-react";

const STORAGE_KEY = "mm_flows_onboarded";

// Phase 8 polish — a one-time hint shown the first time someone opens the
// flow canvas, explaining the drag → connect → run loop. Purely
// client-side and non-blocking: it never gates the canvas, just floats
// over it until dismissed or a node is added.
export default function OnboardingHint({ hasNodes }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        setDismissed(false);
      }
    } catch (e) {
      // localStorage unavailable (private browsing etc.) — just skip the hint.
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch (e) {
      // ignore
    }
  }

  if (dismissed || hasNodes) return null;

  return (
    <div className="pointer-events-auto absolute left-4 top-4 z-10 max-w-xs rounded-2xl border border-signal/30 bg-surface/95 p-3.5 shadow-xl backdrop-blur">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-signal">
          <MousePointerClick className="h-3.5 w-3.5" />
          Quick start
        </span>
        <button
          onClick={dismiss}
          className="text-mist transition hover:text-paper"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="text-xs leading-5 text-mist">
        Drag a node from the left panel onto the canvas, drag from one node's
        edge to another to connect them, then hit <strong className="text-paper">Run</strong> to
        try it out.
      </p>
    </div>
  );
}
