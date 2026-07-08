"use client";

import { useEffect, useState } from "react";

const PROMPT = "Explain quantum entanglement in two sentences.";

const COLUMNS = [
  {
    key: "groq",
    name: "Groq",
    sub: "Llama 3.3 · 70B",
    color: "text-groq",
    dot: "bg-groq",
    latency: 480,
    startDelay: 200,
    text:
      "Quantum entanglement links two particles so a measurement on one instantly tells you the state of the other. This holds even across huge distances, though no usable information travels faster than light.",
  },
  {
    key: "gemini",
    name: "Gemini",
    sub: "2.0 Flash",
    color: "text-gemini",
    dot: "bg-gemini",
    latency: 1120,
    startDelay: 600,
    text:
      "Entanglement is a quantum correlation where two particles share one combined state, so measuring one immediately fixes the outcome for the other. Einstein famously called this 'spooky action at a distance.'",
  },
  {
    key: "deepseek",
    name: "DeepSeek",
    sub: "Chat",
    color: "text-deepseek",
    dot: "bg-deepseek",
    latency: 1980,
    startDelay: 1000,
    text:
      "When two particles become entangled, their properties stay correlated regardless of the distance between them, so measuring one collapses the joint wavefunction and instantly defines the other's state. This doesn't allow faster-than-light communication, since the outcome still looks random locally.",
  },
];

function TypedColumn({ col }) {
  const [visibleChars, setVisibleChars] = useState(0);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    let interval;
    const startTimer = setTimeout(() => {
      setStarted(true);
      interval = setInterval(() => {
        setVisibleChars((prev) => {
          if (prev >= col.text.length) {
            clearInterval(interval);
            setDone(true);
            return prev;
          }
          return prev + 2;
        });
      }, 18);
    }, col.startDelay);

    return () => {
      clearTimeout(startTimer);
      clearInterval(interval);
    };
  }, [col]);

  return (
    <div className="flex flex-1 flex-col rounded-xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
          <span className={`font-mono text-xs font-medium ${col.color}`}>{col.name}</span>
          <span className="font-mono text-[10px] text-mist/70">{col.sub}</span>
        </div>
        <span className="font-mono text-[10px] text-mist/60">
          {done ? `${col.latency}ms` : started ? "…" : ""}
        </span>
      </div>
      <p className="font-mono text-[13px] leading-relaxed text-paper/90">
        {col.text.slice(0, visibleChars)}
        {!done && started && <span className="animate-blink text-signal">▍</span>}
      </p>
    </div>
  );
}

export default function LiveDemo() {
  return (
    <div className="rounded-2xl border border-line bg-surface2/60 p-4 shadow-2xl shadow-black/40 sm:p-6">
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-ink/60 px-4 py-2.5">
        <span className="font-mono text-xs text-mist">You asked</span>
        <span className="h-3 w-px bg-line" />
        <span className="truncate font-mono text-xs text-paper/90">{PROMPT}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {COLUMNS.map((col) => (
          <TypedColumn key={col.key} col={col} />
        ))}
      </div>
    </div>
  );
}
