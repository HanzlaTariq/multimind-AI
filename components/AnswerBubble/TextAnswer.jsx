"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Pin, PinOff } from "lucide-react";
import ModelDropdown from "./ModelDropdown";
import CodeBlock from "./CodeBlock";
import ActionButtons from "./ActionButtons";

export default function TextAnswer({
  best,
  activeResponse,
  isViewingBest,
  hasAlternatives,
  successfulOthers,
  selectedModel,
  setSelectedModel,
  pinned,
  onTogglePin,
  onShare,
  onRegenerate,
  shouldType,
  onTypingDone,
  fontClass,
  isDarkTheme,
}) {
  const [visibleChars, setVisibleChars] = useState(
    shouldType && best?.text ? 0 : best?.text?.length || 0
  );
  const typedForRef = useRef(null);
  const isError = activeResponse.status === "error";

  // Typewriter effect
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
  }, [best?.text, shouldType, onTypingDone]);

  const shownText = isViewingBest ? activeResponse.text.slice(0, visibleChars) : activeResponse.text;
  const stillTyping = isViewingBest && visibleChars < activeResponse.text.length;

  return (
    <div className="group min-w-0 max-w-2xl">
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
          className={`prose prose-sm max-w-none text-[13.5px] leading-relaxed prose-p:my-2 prose-pre:m-0 prose-pre:bg-transparent prose-pre:p-0 prose-code:text-signal prose-code:before:content-none prose-code:after:content-none ${
            isDarkTheme ? "prose-invert" : ""
          } ${fontClass} ${isError ? "text-red-300" : "text-paper/90"}`}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: CodeBlock,
              table: ({ children }) => (
                <div className="my-2 -mx-4 overflow-x-auto px-4">
                  <table className="w-full min-w-[480px] border-collapse text-left">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="whitespace-nowrap border-b border-line px-2 py-1.5 font-semibold">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border-b border-line/50 px-2 py-1.5 align-top">{children}</td>
              ),
            }}
          >
            {shownText}
          </ReactMarkdown>
          {stillTyping && <span className="animate-blink text-signal">▍</span>}
        </div>
      </div>

      {!isError && !stillTyping && (
        <ActionButtons
          text={activeResponse.text}
          model={activeResponse.model}
          pinned={pinned}
          onTogglePin={onTogglePin}
          onShare={onShare}
          onRegenerate={onRegenerate}
        />
      )}
    </div>
  );
}