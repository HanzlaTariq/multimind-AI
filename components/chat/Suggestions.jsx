import { Code2, Lightbulb, PenLine, Sparkles } from "lucide-react";

const SUGGESTIONS = [
  { icon: Code2, label: "Debug", prompt: "Explain what's wrong with this code and fix it:\n\n" },
  { icon: Lightbulb, label: "Explain", prompt: "Explain how " },
  { icon: PenLine, label: "Write", prompt: "Write a short " },
  { icon: Sparkles, label: "Chat", prompt: "" },
];

export default function Suggestions({ onSelect }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      {SUGGESTIONS.map((s) => (
        <button
          key={s.label}
          onClick={() => onSelect(s.prompt)}
          className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm text-paper/90 transition hover:border-mist/40 hover:bg-surface2"
        >
          <s.icon className="h-3.5 w-3.5 text-mist" />
          {s.label}
        </button>
      ))}
    </div>
  );
}