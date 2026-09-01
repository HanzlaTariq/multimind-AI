"use client";

import { memo } from "react";
import { Handle, Position } from "reactflow";
import { getNodeTypeDef, getNodeSummary, NODE_CATEGORIES } from "./nodeTypesConfig";
import { getNodeIcon } from "./nodeIcons";
import { accentClasses } from "./accentClasses";

function FlowNode({ data, selected }) {
  const def = getNodeTypeDef(data.nodeType) || {
    label: data.nodeType,
    icon: "Sparkles",
    category: "logic",
    description: "",
  };
  const Icon = getNodeIcon(def.icon);
  const accent = accentClasses(NODE_CATEGORIES[def.category]?.accent);
  const isTrigger = def.category === "trigger";

  return (
    <div
      className={`w-56 rounded-xl border bg-surface px-3.5 py-3 shadow-lg shadow-black/20 transition ${
        selected ? "border-signal" : `${accent.border} ${accent.borderHover}`
      }`}
    >
      {/* Trigger nodes start a flow, so they have no input handle. */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-2.5 !w-2.5 !border-2 !border-surface !bg-mist"
        />
      )}

      <div className="mb-1.5 flex items-center gap-2">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${accent.bg}`}>
          <Icon className={`h-3.5 w-3.5 ${accent.icon}`} />
        </span>
        <p className="truncate text-sm font-medium text-paper">
          {data.label || def.label}
        </p>
      </div>
      <p className="line-clamp-2 text-[11px] leading-snug text-mist">
        {data.notes || getNodeSummary(data.nodeType, data.config)}
      </p>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-surface !bg-mist"
      />
    </div>
  );
}

export default memo(FlowNode);
