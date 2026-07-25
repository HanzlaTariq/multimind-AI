"use client";

import { Download, RefreshCw, Pin, PinOff, Sparkles, Share2 } from "lucide-react";

const MODEL_LABEL = {
  gemini: "Gemini",
  groq: "Groq",
  deepseek: "DeepSeek",
  multimind: "MultiMind",
};

export default function ImageAnswer({
  best,
  onRegenerate,
  onTogglePin,
  onShare,
  pinned,
  isDarkTheme,
}) {
  return (
    <div className="group max-w-md">
      <div
        className={`relative overflow-hidden rounded-2xl border shadow-sm shadow-black/10 ${
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
        {onShare && (
          <button
            onClick={onShare}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-mist transition hover:bg-surface2 hover:text-paper"
            title="Share this conversation"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
        )}
      </div>
    </div>
  );
}