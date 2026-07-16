"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Sparkles, Copy, Check, ArrowRight } from "lucide-react";
import MermaidDiagram from "@/components/MermaidDiagram";

function CodeBlock({ inline, className, children, ...props }) {
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
    <div className="relative my-2.5">
      <div className="flex items-center justify-between rounded-t-lg border border-b-0 border-line bg-surface2 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-mist/60">
          {lang || "code"}
        </span>
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-mist transition hover:bg-surface hover:text-paper"
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

export default function SharedConversationView({ conversation }) {
  return (
    <div className="min-h-screen bg-ink">
      <header className="sticky top-0 z-10 border-b border-line/60 bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-gemini via-groq to-deepseek">
              <span className="h-2.5 w-2.5 rounded-sm bg-ink" />
            </span>
            <span className="font-display text-base font-semibold text-paper">MultiMind</span>
          </Link>
          <Link
            href="/signup"
            className="flex items-center gap-1.5 rounded-full bg-signal px-4 py-2 text-xs font-semibold text-ink transition hover:brightness-110"
          >
            Try MultiMind
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="mb-6 text-xs text-mist/60">Shared conversation · read-only</p>

        <div className="space-y-8">
          {conversation.turns.map((turn, i) => (
            <div key={i} className="space-y-3">
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-surface px-4 py-2.5 text-[15px] text-paper sm:max-w-[75%]">
                  {turn.prompt}
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gemini via-groq to-deepseek shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-ink" />
                </div>
                <div className="min-w-0 max-w-2xl flex-1 rounded-2xl border border-line bg-surface px-4 py-3.5">
                  {turn.best?.type === "image" && turn.best?.imageData ? (
                    <div className="overflow-hidden rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={turn.best.imageData}
                        alt={turn.best.text || "Generated image"}
                        className="w-full"
                      />
                    </div>
                  ) : (
                    <div className="prose prose-sm prose-invert max-w-none text-[13.5px] leading-relaxed text-paper/90 prose-p:my-2 prose-pre:m-0 prose-pre:bg-transparent prose-pre:p-0 prose-code:text-signal prose-code:before:content-none prose-code:after:content-none">
                      <ReactMarkdown components={{ code: CodeBlock }}>
                        {turn.best?.text || ""}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface px-6 py-10 text-center">
          <p className="font-display text-lg font-semibold text-paper">
            Get answers like this from three AI models at once.
          </p>
          <Link
            href="/signup"
            className="mt-2 flex items-center gap-2 rounded-full bg-signal px-6 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110"
          >
            Try MultiMind free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}