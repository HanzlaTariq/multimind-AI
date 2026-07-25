"use client";

import { useState } from "react";
import { useSettings } from "@/lib/SettingsContext";
import CodeBlock from "./CodeBlock";
import ModelDropdown from "./ModelDropdown";
import ImageAnswer from "./ImageAnswer";
import TextAnswer from "./TextAnswer";

export default function AnswerBubble({
  best,
  responses = [],
  pending,
  pendingLabel,
  onRegenerate,
  regenerating,
  pinned,
  onTogglePin,
  onShare,
  shouldType,
  onTypingDone,
  fontClass = "",
}) {
  const { settings } = useSettings();
  const [selectedModel, setSelectedModel] = useState(null);
  const isDarkTheme = settings.theme !== "light" && settings.theme !== "sepia";

  // Loading state
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

  // Image response
  if (isImage) {
    return (
      <ImageAnswer
        best={best}
        onRegenerate={onRegenerate}
        onTogglePin={onTogglePin}
        onShare={onShare}
        pinned={pinned}
        isDarkTheme={isDarkTheme}
      />
    );
  }

  // Text response
  return (
    <TextAnswer
      best={best}
      activeResponse={activeResponse}
      isViewingBest={!selectedModel}
      hasAlternatives={hasAlternatives}
      successfulOthers={successfulOthers}
      selectedModel={selectedModel}
      setSelectedModel={setSelectedModel}
      pinned={pinned}
      onTogglePin={onTogglePin}
      onShare={onShare}
      onRegenerate={onRegenerate}
      shouldType={shouldType}
      onTypingDone={onTypingDone}
      fontClass={fontClass}
      isDarkTheme={isDarkTheme}
    />
  );
}