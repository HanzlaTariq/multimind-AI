"use client";

import { X, Trash2 } from "lucide-react";
import { getNodeTypeDef, fieldIsVisible } from "./nodeTypesConfig";
import { getNodeIcon } from "./nodeIcons";
import { accentClasses } from "./accentClasses";
import ConfigField from "./ConfigField";

export default function NodeInspector({ node, onChange, onDelete, onClose }) {
  if (!node) return null;
  const def = getNodeTypeDef(node.data.nodeType);
  const Icon = getNodeIcon(def?.icon);
  const accentKey =
    def?.category === "trigger" ? "amber" : def?.category === "ai" ? "violet" : def?.category === "platform" ? "sky" : "emerald";
  const accent = accentClasses(accentKey);
  const config = node.data.config || {};
  const schema = def?.configSchema || [];

  function handleConfigChange(key, value) {
    onChange(node.id, { config: { ...config, [key]: value } });
  }

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-line bg-surface/60 p-4">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${accent.bg}`}>
            <Icon className={`h-4 w-4 ${accent.icon}`} />
          </span>
          <div>
            <p className="text-sm font-medium text-paper">{def?.label || node.data.nodeType}</p>
            <p className="text-[11px] text-mist/60">{def?.description}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-mist transition hover:text-paper" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto scrollbar-thin">
        <div>
          <label className="mb-1 block text-xs text-mist">Label</label>
          <input
            value={node.data.label || ""}
            onChange={(e) => onChange(node.id, { label: e.target.value })}
            placeholder={def?.label}
            className="w-full rounded-lg border border-line bg-surface2 px-3 py-2 text-sm text-paper outline-none focus:border-signal/50"
          />
        </div>

        {schema.length > 0 && <div className="my-1 border-t border-line" />}

        {schema.filter((field) => fieldIsVisible(field, config)).map((field) => (
          <div key={field.key}>
            <label className="mb-1 block text-xs text-mist">{field.label}</label>
            <ConfigField
              field={field}
              value={config[field.key]}
              onChange={(value) => handleConfigChange(field.key, value)}
            />
          </div>
        ))}

        {schema.length > 0 && <div className="my-1 border-t border-line" />}

        <div>
          <label className="mb-1 block text-xs text-mist">Notes</label>
          <textarea
            value={node.data.notes || ""}
            onChange={(e) => onChange(node.id, { notes: e.target.value })}
            rows={2}
            placeholder="What does this step do in this flow?"
            className="w-full resize-none rounded-lg border border-line bg-surface2 px-3 py-2 text-sm text-paper outline-none focus:border-signal/50"
          />
        </div>
      </div>

      <button
        onClick={() => onDelete(node.id)}
        className="mt-3 shrink-0 flex items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs text-mist transition hover:border-red-400/40 hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Remove node
      </button>
    </aside>
  );
}
