"use client";

import { useEffect, useRef, useState, useId } from "react";

let mermaidInstance = null;
async function getMermaid() {
  if (!mermaidInstance) {
    const mod = await import("mermaid");
    mermaidInstance = mod.default;
    mermaidInstance.initialize({
      startOnLoad: false,
      theme: "dark",
      themeVariables: {
        background: "#11151D",
        primaryColor: "#171C26",
        primaryTextColor: "#E7E9EE",
        primaryBorderColor: "#232936",
        lineColor: "#8B93A3",
        secondaryColor: "#171C26",
        tertiaryColor: "#0B0E14",
      },
      fontFamily: "var(--font-body), sans-serif",
    });
  }
  return mermaidInstance;
}

export default function MermaidDiagram({ code }) {
  const containerId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState(null);
  const [error, setError] = useState(null);
  const renderedFor = useRef(null);

  useEffect(() => {
    if (renderedFor.current === code) return;
    let cancelled = false;

    (async () => {
      try {
        const mermaid = await getMermaid();
        const { svg } = await mermaid.render(`mermaid-${containerId}`, code);
        if (!cancelled) {
          setSvg(svg);
          setError(null);
          renderedFor.current = code;
        }
      } catch (err) {
        if (!cancelled) setError("Couldn't render this diagram.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, containerId]);

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