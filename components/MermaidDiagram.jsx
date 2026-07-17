"use client";

import { useEffect, useRef, useState, useId } from "react";
import { useSettings } from "@/lib/SettingsContext";

const DARK_VARS = {
  background: "#11151D",
  primaryColor: "#171C26",
  primaryTextColor: "#E7E9EE",
  primaryBorderColor: "#232936",
  lineColor: "#8B93A3",
  secondaryColor: "#171C26",
  tertiaryColor: "#0B0E14",
};

const LIGHT_VARS = {
  background: "#FFFFFF",
  primaryColor: "#F1F5F9",
  primaryTextColor: "#0F172A",
  primaryBorderColor: "#E2E8F0",
  lineColor: "#64748B",
  secondaryColor: "#F1F5F9",
  tertiaryColor: "#F8FAFC",
};

let mermaidInstance = null;
let currentThemeKey = null;
let renderQueue = Promise.resolve();

async function getMermaid(isDark) {
  const mod = await import("mermaid");
  if (!mermaidInstance) {
    mermaidInstance = mod.default;
  }

  // Only re-initialize when the theme actually changes — calling
  // initialize() on every render (especially while another render is still
  // in flight) is what caused the intermittent failures.
  const themeKey = isDark ? "dark" : "light";
  if (currentThemeKey !== themeKey) {
    mermaidInstance.initialize({
      startOnLoad: false,
      theme: isDark ? "dark" : "neutral",
      themeVariables: isDark ? DARK_VARS : LIGHT_VARS,
      fontFamily: "var(--font-body), sans-serif",
    });
    currentThemeKey = themeKey;
  }

  return mermaidInstance;
}

// mermaid.js isn't safe for multiple concurrent render() calls against a
// shared instance — chain every render request onto one queue so they run
// one at a time, app-wide.
function queuedRender(id, code, isDark) {
  const task = renderQueue.then(async () => {
    const mermaid = await getMermaid(isDark);
    return mermaid.render(id, code);
  });
  renderQueue = task.then(
    () => {},
    () => {}
  );
  return task;
}

export default function MermaidDiagram({ code }) {
  const { settings } = useSettings();
  const isDark = settings.theme !== "light" && settings.theme !== "sepia";
  const containerId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState(null);
  const [error, setError] = useState(null);
  const renderedForRef = useRef(null);

  useEffect(() => {
    const cacheKey = `${code}::${isDark ? "dark" : "light"}`;
    if (renderedForRef.current === cacheKey) return;
    let cancelled = false;

    (async () => {
      try {
        const { svg } = await queuedRender(`mermaid-${containerId}`, code, isDark);
        if (!cancelled) {
          setSvg(svg);
          setError(null);
          renderedForRef.current = cacheKey;
        }
      } catch (err) {
        if (!cancelled) setError("Couldn't render this diagram.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, containerId, isDark]);

  if (error) {
    return (
      <div className="my-2.5 rounded-lg border border-line bg-ink p-3 font-mono text-xs text-mist/70">
        {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-2.5 flex items-center gap-1.5 rounded-lg border border-line bg-ink px-3 py-4">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-mist/50 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-mist/50 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-mist/50" />
      </div>
    );
  }

  return (
    <div
      className="my-2.5 overflow-x-auto rounded-lg border border-line bg-ink p-3 [&_svg]:mx-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}