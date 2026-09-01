"use client";

import { NODE_CATEGORIES, NODE_TYPES } from "./nodeTypesConfig";
import { getNodeIcon } from "./nodeIcons";
import { accentClasses } from "./accentClasses";

// React Flow's own drag-and-drop convention: stash the node type on the
// dataTransfer object during dragstart, read it back in the canvas's
// onDrop. See https://reactflow.dev/examples/interaction/drag-and-drop
function handleDragStart(e, nodeType) {
  e.dataTransfer.setData("application/reactflow", nodeType);
  e.dataTransfer.effectAllowed = "move";
}

export default function NodePalette() {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col overflow-y-auto border-r border-line bg-surface/60 p-3 scrollbar-thin">
      <p className="mb-2 px-1 text-xs text-mist">
        Drag a node onto the canvas, then connect it to build your flow.
      </p>
      {Object.entries(NODE_CATEGORIES).map(([categoryKey, category]) => (
        <div key={categoryKey} className="mb-4">
          <p className="mb-1.5 px-1 text-[11px] font-medium text-mist/70">
            {category.label}
          </p>
          <div className="space-y-1.5">
            {NODE_TYPES.filter((n) => n.category === categoryKey).map((n) => {
              const Icon = getNodeIcon(n.icon);
              const accent = accentClasses(category.accent);
              return (
                <div
                  key={n.type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, n.type)}
                  title={n.description}
                  className={`flex cursor-grab items-center gap-2 rounded-lg border border-line bg-surface2 px-2.5 py-2 text-xs text-paper transition active:cursor-grabbing ${accent.borderHover}`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${accent.bg}`}>
                    <Icon className={`h-3 w-3 ${accent.icon}`} />
                  </span>
                  <span className="truncate">{n.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </aside>
  );
}
