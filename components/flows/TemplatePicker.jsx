"use client";

import { X, FilePlus2 } from "lucide-react";
import { FLOW_TEMPLATES } from "@/lib/flowTemplates";
import { getNodeIcon } from "./nodeIcons";
import { accentClasses } from "./accentClasses";

// Phase 8 — shown when the user clicks "New flow". Picking a template
// pre-fills the name/description form with the template's defaults and
// carries the template id through to POST /api/flows, which stamps out
// the actual node/edge graph server-side (lib/flowTemplates.js). Picking
// "Blank flow" behaves exactly like flow creation did before Phase 8.
export default function TemplatePicker({ open, onClose, onPick }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-line bg-surface p-6 text-left shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-signal">
              New flow
            </p>
            <h3 className="mt-3 text-xl font-semibold text-paper">
              Start from a template, or build from scratch
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-mist transition hover:text-paper"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => onPick(null)}
            className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface2 p-3.5 text-left transition hover:border-signal/40"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mist/10">
              <FilePlus2 className="h-4 w-4 text-mist" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-paper">Blank flow</span>
              <span className="block text-xs text-mist">Start with an empty canvas</span>
            </span>
          </button>

          {FLOW_TEMPLATES.map((t) => {
            const Icon = getNodeIcon(t.icon);
            const accent = accentClasses(t.accent);
            return (
              <button
                key={t.id}
                onClick={() => onPick(t.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface2 p-3.5 text-left transition hover:border-signal/40"
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent.bg}`}>
                  <Icon className={`h-4 w-4 ${accent.icon}`} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-paper">{t.name}</span>
                  <span className="block text-xs text-mist">{t.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
