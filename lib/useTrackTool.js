"use client";

import { useEffect } from "react";

export function useTrackTool(toolId, label, href) {
  useEffect(() => {
    if (!toolId) return;
    fetch("/api/documents/track-tool", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolId, label, href }),
    }).catch(() => {
      // purely a UX nicety (recent tools list) — fine to fail silently
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolId]);
}