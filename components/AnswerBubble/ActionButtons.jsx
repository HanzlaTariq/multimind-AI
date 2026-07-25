"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Pin,
  PinOff,
  FileDown,
  Volume2,
  Square,
  Share2,
} from "lucide-react";
import { exportTextToPdf } from "@/lib/pdfExport";

const MODEL_LABEL = {
  gemini: "Gemini",
  groq: "Groq",
  deepseek: "DeepSeek",
  multimind: "MultiMind",
};

export default function ActionButtons({
  text,
  model,
  pinned,
  onTogglePin,
  onShare,
  onRegenerate,
}) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  async function handleCopy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // clipboard may be unavailable — fail silently
    }
  }

  function handleExportPdf() {
    if (!text) return;
    exportTextToPdf(text, "multimind-answer.pdf");
  }

  function stripForSpeech(text) {
    return text
      .replace(/```[\s\S]*?```/g, " Code block omitted. ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  }

  function handleReadAloud() {
    if (typeof window === "undefined" || !window.speechSynthesis || !text) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(stripForSpeech(text));
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  return (
    <div
      className={`mt-1.5 flex flex-wrap items-center gap-1 transition-opacity focus-within:opacity-100 group-hover:opacity-100 ${
        speaking ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="mr-2 flex items-center gap-1 text-[10px] text-mist/50">
        <Sparkles className="h-3 w-3" />
        {MODEL_LABEL[model] || "MultiMind"}
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
        onClick={handleReadAloud}
        className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition hover:bg-surface2 ${
          speaking ? "text-signal" : "text-mist hover:text-paper"
        }`}
        title={speaking ? "Stop reading" : "Read aloud"}
      >
        {speaking ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        {speaking ? "Stop" : "Read aloud"}
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
  );
}