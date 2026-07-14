"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Pin,
  PinOff,
  Download,
  FileDown,
  ChevronDown,
  Zap,
  Layers,
  Brain,
} from "lucide-react";
import MermaidDiagram from "@/components/MermaidDiagram";
import { exportTextToPdf } from "@/lib/pdfExport";

const MODEL_LABEL = {
  gemini: "Gemini",
  groq: "Groq",
  deepseek: "DeepSeek",
  multimind: "MultiMind",
};

const MODEL_ICON = {
  gemini: Layers,
  groq: Zap,
  deepseek: Brain,
  multimind: Sparkles,
};

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

function ModelDropdown({ options, selectedModel, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const currentLabel = selectedModel ? MODEL_LABEL[selectedModel] || selectedModel : "Best";
  const CurrentIcon = selectedModel ? MODEL_ICON[selectedModel] || Sparkles : Sparkles;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-line bg-surface2 px-2.5 py-1 text-[11px] font-medium text-paper transition hover:border-mist/40"
      >
        <CurrentIcon className="h-3 w-3 text-signal" />
        {currentLabel}
        <ChevronDown
          className={`h-3 w-3 text-mist transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-40 overflow-hidden rounded-lg border border-line bg-surface shadow-xl shadow-black/30">
          <button
            onClick={() => {
              onSelect(null);
              setOpen(false);
            }}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-surface2 ${
              !selectedModel ? "text-signal" : "text-paper"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Best
          </button>
          <div className="h-px bg-line" />
          {options.map((r) => {
            const Icon = MODEL_ICON[r.model] || Sparkles;
            return (
              <button
                key={r.model}
                onClick={() => {
                  onSelect(r.model);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-surface2 ${
                  selectedModel === r.model ? "text-signal" : "text-paper"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {MODEL_LABEL[r.model] || r.model}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AnswerBubble({
  best,
  responses = [],
  pending,
  pendingLabel,
  onRegenerate,
  regenerating,
  pinned,
  onTogglePin,
  shouldType,
  onTypingDone,
  fontClass = "",
}) {
  const [copied, setCopied] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null); // null = "Best"
  const [visibleChars, setVisibleChars] = useState(
    shouldType && best?.text ? 0 : best?.text?.length || 0
  );
  const typedForRef = useRef(null);

  // Typewriter only ever animates the "Best" answer — switching the dropdown
  // to a specific model shows its full text immediately, no re-typing.
  useEffect(() => {
    if (!best?.text) return;

    if (!shouldType || typedForRef.current === best.text) {
      setVisibleChars(best.text.length);
      return;
    }

    typedForRef.current = best.text;
    setVisibleChars(0);

    const total = best.text.length;
    const step = Math.max(1, Math.round(total / 120));
    const intervalMs = 12;

    const interval = setInterval(() => {
      setVisibleChars((prev) => {
        const next = prev + step;
        if (next >= total) {
          clearInterval(interval);
          onTypingDone?.();
          return total;
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [best?.text, shouldType]);

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

  const isImage = best.type === "image" && best.imageData && best.status !== "error";

  const successfulOthers = (responses || []).filter(
    (r) => r.status === "ok" && r.text && r.text.trim()
  );
  const hasAlternatives = successfulOthers.length > 1;

  const activeResponse = selectedModel
    ? successfulOthers.find((r) => r.model === selectedModel) || best
    : best;
  const isViewingBest = !selectedModel;
  const isError = activeResponse.status === "error";

  async function handleCopy() {
    if (!activeResponse?.text) return;
    try {
      await navigator.clipboard.writeText(activeResponse.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // clipboard may be unavailable — fail silently
    }
  }

  function handleExportPdf() {
    if (!activeResponse?.text) return;
    exportTextToPdf(activeResponse.text, "multimind-answer.pdf");
  }

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

  const shownText = isViewingBest ? activeResponse.text.slice(0, visibleChars) : activeResponse.text;
  const stillTyping = isViewingBest && visibleChars < activeResponse.text.length;

  return (
    <div className="group max-w-2xl">
      {hasAlternatives && (
        <div className="mb-1.5">
          <ModelDropdown
            options={successfulOthers}
            selectedModel={selectedModel}
            onSelect={setSelectedModel}
          />
        </div>
      )}

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
          className={`prose prose-sm prose-invert max-w-none text-[13.5px] leading-relaxed prose-p:my-2 prose-pre:m-0 prose-pre:bg-transparent prose-pre:p-0 prose-code:text-signal prose-code:before:content-none prose-code:after:content-none ${fontClass} ${
            isError ? "text-red-300" : "text-paper/90"
          }`}
        >
          <ReactMarkdown components={{ code: CodeBlock }}>{shownText}</ReactMarkdown>
          {stillTyping && <span className="animate-blink text-signal">▍</span>}
        </div>
      </div>

      {!isError && !stillTyping && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <div className="mr-2 flex items-center gap-1 text-[10px] text-mist/50">
            <Sparkles className="h-3 w-3" />
            {MODEL_LABEL[activeResponse.model] || "MultiMind"}
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-mist transition hover:bg-surface2 hover:text-paper"
            title="Copy answer"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-signal" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-mist transition hover:bg-surface2 hover:text-paper"
            title="Export this answer as PDF"
          >
            <FileDown className="h-3.5 w-3.5" />
            PDF
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