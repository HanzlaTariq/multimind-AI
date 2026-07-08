"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, Check, RefreshCw, Sparkles } from "lucide-react";

const MODEL_LABEL = {
  gemini: "Gemini",
  groq: "Groq",
  deepseek: "DeepSeek",
  multimind: "MultiMind",
};

export default function AnswerBubble({ best, pending, onRegenerate, regenerating }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!best?.text) return;
    try {
      await navigator.clipboard.writeText(best.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // clipboard may be unavailable — fail silently
    }
  }

  if (pending || regenerating) {
    return (
      <div className="max-w-2xl rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-sm shadow-black/10">
        <div className="flex items-center gap-1.5 py-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-signal/70 [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-signal/70 [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-signal/70" />
        </div>
      </div>
    );
  }

  if (!best) return null;

  const isError = best.status === "error";

  return (
    <div className="group max-w-2xl">
      <div
        className={`rounded-2xl border px-4 py-3.5 shadow-sm shadow-black/10 ${
          isError ? "border-red-500/30 bg-red-500/5" : "border-line bg-surface"
        }`}
      >
        <div
          className={`prose prose-sm prose-invert max-w-none text-[13.5px] leading-relaxed prose-p:my-2 prose-pre:bg-ink prose-pre:border prose-pre:border-line prose-pre:rounded-lg prose-code:text-signal prose-code:before:content-none prose-code:after:content-none ${
            isError ? "text-red-300" : "text-paper/90"
          }`}
        >
          <ReactMarkdown>{best.text}</ReactMarkdown>
        </div>
      </div>

      {!isError && (
        <div className="mt-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <div className="flex items-center gap-1 text-[10px] text-mist/50 mr-2">
            <Sparkles className="h-3 w-3" />
            {MODEL_LABEL[best.model] || "MultiMind"}
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-mist transition hover:bg-surface2 hover:text-paper"
            title="Copy answer"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-signal" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-mist transition hover:bg-surface2 hover:text-paper"
              title="Regenerate answer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate
            </button>
          )}
        </div>
      )}
    </div>
  );
}