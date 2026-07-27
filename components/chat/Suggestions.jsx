"use client";

import { useState } from "react";
import { MessageCircle, GraduationCap, Briefcase, Code2 } from "lucide-react";

// Grouped by audience, not by feature, so every kind of user — student,
// freelancer/business owner, or someone just handling everyday tasks —
// immediately sees a category meant for them, not just dev-flavored
// suggestions. English copy so it reads naturally for a global audience;
// the underlying chat model still replies in whatever language the user
// actually types in.
const CATEGORIES = [
  {
    id: "everyday",
    label: "Everyday",
    icon: MessageCircle,
    prompts: [
      { label: "Write a letter", prompt: "Write a formal letter/application about: " },
      { label: "Draft a message", prompt: "Write a polite message about: " },
      { label: "Translate this", prompt: "Translate this: " },
    ],
  },
  {
    id: "study",
    label: "Study",
    icon: GraduationCap,
    prompts: [
      { label: "Explain simply", prompt: "Explain this topic in simple terms: " },
      { label: "Quiz me", prompt: "Quiz me with 5 questions on this topic: " },
      { label: "Summarize", prompt: "Summarize this:\n\n" },
    ],
  },
  {
    id: "business",
    label: "Business",
    icon: Briefcase,
    prompts: [
      { label: "Draft an invoice", prompt: "Draft an invoice for this work: " },
      { label: "Client proposal", prompt: "Help me write a client proposal for this project: " },
      { label: "Social caption", prompt: "Write a social media caption about: " },
    ],
  },
  {
    id: "code",
    label: "Code",
    icon: Code2,
    prompts: [
      { label: "Debug", prompt: "Explain what's wrong with this code and fix it:\n\n" },
      { label: "Explain", prompt: "Explain how " },
      { label: "Write", prompt: "Write a short " },
    ],
  },
];

export default function Suggestions({ onSelect }) {
  const [activeId, setActiveId] = useState(CATEGORIES[0].id);
  const activeCategory = CATEGORIES.find((c) => c.id === activeId) || CATEGORIES[0];

  return (
    <div className="mt-4 flex w-full max-w-xl flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {CATEGORIES.map((c) => {
          const isActive = c.id === activeId;
          return (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                isActive
                  ? "border-mist/50 bg-surface2 text-paper"
                  : "border-line bg-surface text-paper/60 hover:border-mist/30 hover:text-paper/90"
              }`}
            >
              <c.icon className="h-3.5 w-3.5" />
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {activeCategory.prompts.map((p) => (
          <button
            key={p.label}
            onClick={() => onSelect(p.prompt)}
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-paper/90 transition hover:border-mist/40 hover:bg-surface2"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}