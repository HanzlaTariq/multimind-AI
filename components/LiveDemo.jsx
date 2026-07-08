"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

const PROMPT = "Explain quantum entanglement in two sentences.";

const COLUMNS = [
  {
    key: "groq",
    name: "Groq",
    sub: "Llama 3.3 · 70B",
    color: "text-groq",
    dot: "bg-groq",
    ring: "ring-groq/40",
    top: "before:bg-groq",
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
    ring: "ring-gemini/40",
    top: "before:bg-gemini",
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
    ring: "ring-deepseek/40",
    top: "before:bg-deepseek",
    latency: 1980,
    startDelay: 1000,
    text:
      "When two particles become entangled, their properties stay correlated regardless of the distance between them, so measuring one collapses the joint wavefunction and instantly defines the other's state. This doesn't allow faster-than-light communication, since the outcome still looks random locally.",
  },
];

const WINNER_KEY = "gemini";
const WINNER_REASON = "clearest, most complete explanation";

function TypedColumn({ col, active, onDone }) {
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
            onDone?.(col.key);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [col]);

  const isWinner = col.key === WINNER_KEY;

  return (
    <div
      className={`relative flex w-full flex-col overflow-hidden rounded-xl border bg-surface p-4 transition-all duration-500 before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:content-[''] sm:w-auto sm:shrink ${
        col.top
      } ${
        isWinner && active
          ? `border-transparent ring-2 ${col.ring} shadow-lg shadow-black/30`
          : "border-line"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
          <span className={`font-mono text-xs font-medium ${col.color}`}>{col.name}</span>
          <span className="hidden font-mono text-[10px] text-mist/70 sm:inline">{col.sub}</span>
        </div>
        <span className="font-mono text-[10px] text-mist/60">
          {done ? `${col.latency}ms` : started ? "…" : ""}
        </span>
      </div>
      <p className="font-mono text-[13px] leading-relaxed text-paper/90">
        {col.text.slice(0, visibleChars)}
        {!done && started && <span className="animate-blink text-signal">▍</span>}
      </p>

      {isWinner && active && (
        <div className="mt-3 flex items-center gap-1.5 border-t border-line/60 pt-3 font-mono text-[10px] text-signal">
          <Check className="h-3 w-3" />
          Picked as the best answer
        </div>
      )}
    </div>
  );
}

export default function LiveDemo() {
  const [doneKeys, setDoneKeys] = useState([]);
  const [revealed, setRevealed] = useState(false);

  function handleDone(key) {
    setDoneKeys((prev) => {
      const next = prev.includes(key) ? prev : [...prev, key];
      if (next.length === COLUMNS.length) {
        setTimeout(() => setRevealed(true), 300);
      }
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface2/60 p-4 shadow-2xl shadow-black/40 sm:p-6">
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-ink/60 px-4 py-2.5">
        <span className="font-mono text-xs text-mist">You asked</span>
        <span className="h-3 w-px bg-line" />
        <span className="truncate font-mono text-xs text-paper/90">{PROMPT}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {COLUMNS.map((col) => (
          <TypedColumn key={col.key} col={col} active={revealed} onDone={handleDone} />
        ))}
      </div>

      <div
        className={`mt-4 flex items-center gap-2 overflow-hidden rounded-lg border border-signal/30 bg-signal/5 px-4 py-2.5 transition-all duration-500 ${
          revealed ? "max-h-20 opacity-100" : "max-h-0 border-transparent bg-transparent px-0 py-0 opacity-0"
        }`}
      >
        <Check className="h-3.5 w-3.5 shrink-0 text-signal" />
        <span className="font-mono text-xs text-paper/90">
          MultiMind picked <span className="text-gemini">Gemini's</span> answer — {WINNER_REASON}.
        </span>
      </div>
    </div>
  );
}