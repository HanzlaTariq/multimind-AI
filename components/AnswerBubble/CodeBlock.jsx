"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import MermaidDiagram from "@/components/MermaidDiagram";

export default function CodeBlock({ inline, className, children, ...props }) {
  const [copied, setCopied] = useState(false);
  const codeText = String(children).replace(/\n$/, "");
  const lang = /language-(\w+)/.exec(className || "")?.[1];

  if (inline) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  if (lang === "mermaid") {
    return <MermaidDiagram code={codeText} />;
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // clipboard may be unavailable — fail silently
    }
  }

  return (
    <div className="group/code relative my-2.5">
      <div className="flex items-center justify-between rounded-t-lg border border-b-0 border-line bg-surface2 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-mist/60">
          {lang || "code"}
        </span>
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-mist transition hover:bg-surface hover:text-paper"
          title="Copy code"
        >
          {copied ? <Check className="h-3 w-3 text-signal" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-b-lg border border-line bg-ink p-3">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}