"use client";

import ReactMarkdown from "react-markdown";

export default function AnswerBubble({ best, pending }) {
  if (pending) {
    return (
      <div className="max-w-2xl rounded-xl border border-line bg-surface p-4">
        <div className="flex items-center gap-1.5 py-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-mist [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-mist [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-mist" />
        </div>
      </div>
    );
  }

  if (!best) return null;

  return (
    <div className="max-w-2xl rounded-xl border border-line bg-surface p-4">
      <div className="prose prose-sm prose-invert max-w-none text-[13.5px] leading-relaxed text-paper/90 prose-p:my-2 prose-pre:bg-ink prose-pre:text-paper">
        <ReactMarkdown>{best.text}</ReactMarkdown>
      </div>
    </div>
  );
}
