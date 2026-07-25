"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Sparkles, Zap, Layers, Brain } from "lucide-react";

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

export default function ModelDropdown({ options, selectedModel, onSelect }) {
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