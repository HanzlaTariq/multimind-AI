"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, Check, RefreshCw, Sparkles, Pin, PinOff, Download } from "lucide-react";

const MODEL_LABEL = {
  gemini: "Gemini",
  groq: "Groq",
  deepseek: "DeepSeek",
  multimind: "MultiMind",
};

function CodeBlock({ inline, className, children, ...props }) {
  const [copied, setCopied] = useState(false);
  const codeText = String(children).replace(/\n$/, "");

  if (inline) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
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

  const lang = /language-(\w+)/.exec(className || "")?.[1];

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

export default function AnswerBubble({
  best,
  pending,
  pendingLabel,
  onRegenerate,
  regenerating,
  pinned,
  onTogglePin,
  typewriter = false,
}) {
  const [copied, setCopied] = useState(false);
  const [entering, setEntering] = useState(false);
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    if (pending || regenerating || !best) {
      setEntering(false);
      setDisplayText("");
      return;
    }

    setEntering(false);
    const frame = requestAnimationFrame(() => setEntering(true));

    return () => cancelAnimationFrame(frame);
  }, [best?.text, best?.imageData, best?.status, pending, regenerating]);

  useEffect(() => {
    if (pending || regenerating || !best) {
      return;
    }

    const fullText = best.text || "";
    if (!typewriter || !fullText || best.type === "image") {
      setDisplayText(fullText);
      return;
    }

    let index = 0;
    let cancelled = false;
    setDisplayText("");

    const step = () => {
      if (cancelled) return;

      index = Math.min(index + Math.max(1, Math.ceil(fullText.length / 80)), fullText.length);
      setDisplayText(fullText.slice(0, index));

      if (index < fullText.length) {
        const delay = fullText.length > 240 ? 12 : 18;
        window.setTimeout(step, delay);
      }
    };

    const start = window.setTimeout(step, 40);

    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
  }, [best, pending, regenerating, typewriter]);

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
        <div className="flex items-center gap-2 py-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-signal/70 [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-signal/70 [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-signal/70" />
          {pendingLabel && <span className="ml-1 text-xs text-mist">{pendingLabel}</span>}
        </div>
      </div>
    );
  }

  if (!best) return null;

  const isError = best.status === "error";
  const isImage = best.type === "image" && best.imageData && !isError;

  if (isImage) {
    return (
      <div className="group max-w-md">
        <div
          className={`overflow-hidden rounded-2xl border shadow-sm shadow-black/10 ${
            pinned ? "border-signal/40" : "border-line"
          } bg-surface`}
        >
          {pinned && (
            <div className="absolute z-10 m-3 flex items-center gap-1 rounded-full border border-signal/40 bg-ink/90 px-2 py-0.5 font-mono text-[10px] text-signal">
              <Pin className="h-2.5 w-2.5" />
              Pinned
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={best.imageData} alt={best.text || "Generated image"} className="w-full" />
        </div>
        {best.text && <p className="mt-2 text-xs text-mist">{best.text}</p>}

        <div className="mt-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <div className="mr-2 flex items-center gap-1 text-[10px] text-mist/50">
            <Sparkles className="h-3 w-3" />
            {MODEL_LABEL[best.model] || "MultiMind"}
          </div>
          <a
            href={best.imageData}
            download="multimind-image.png"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-mist transition hover:bg-surface2 hover:text-paper"
            title="Download image"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </a>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-mist transition hover:bg-surface2 hover:text-paper"
              title="Regenerate image"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate
            </button>
          )}
          {onTogglePin && (
            <button
              onClick={onTogglePin}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition hover:bg-surface2 ${
                pinned ? "text-signal" : "text-mist hover:text-paper"
              }`}
              title={pinned ? "Unpin this image" : "Pin this image"}
            >
              {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              {pinned ? "Unpin" : "Pin"}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`group max-w-2xl ${entering ? "answer-bubble-enter" : ""}`}>
      <div
        className={`relative rounded-2xl border px-4 py-3.5 shadow-sm shadow-black/10 ${
          isError
            ? "border-red-500/30 bg-red-500/5"
            : pinned
            ? "border-signal/40 bg-surface"
            : "border-line bg-surface"
        }`}
      >
        {pinned && !isError && (
          <div className="absolute -top-2.5 left-4 flex items-center gap-1 rounded-full border border-signal/40 bg-ink px-2 py-0.5 font-mono text-[10px] text-signal">
            <Pin className="h-2.5 w-2.5" />
            Pinned
          </div>
        )}
        <div
          className={`prose prose-sm prose-invert max-w-none text-[13.5px] leading-relaxed prose-p:my-2 prose-pre:m-0 prose-pre:bg-transparent prose-pre:p-0 prose-code:text-signal prose-code:before:content-none prose-code:after:content-none ${
            isError ? "text-red-300" : "text-paper/90"
          }`}
        >
          <ReactMarkdown components={{ code: CodeBlock }}>{displayText}</ReactMarkdown>
          {typewriter && displayText.length < (best.text || "").length && !isError && (
            <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 rounded-sm bg-signal/70 align-middle animate-pulse" />
          )}
        </div>
      </div>

      {!isError && (
        <div className="mt-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <div className="mr-2 flex items-center gap-1 text-[10px] text-mist/50">
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
          {onTogglePin && (
            <button
              onClick={onTogglePin}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition hover:bg-surface2 ${
                pinned ? "text-signal" : "text-mist hover:text-paper"
              }`}
              title={pinned ? "Unpin this answer" : "Pin this answer"}
            >
              {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              {pinned ? "Unpin" : "Pin"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}