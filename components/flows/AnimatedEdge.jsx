"use client";

import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "reactflow";

// getBezierPath (unlike the plan's sketch) returns [path, labelX, labelY]
// in React Flow v11 — destructure just the path since this edge has no
// label. BaseEdge handles the selectable/hoverable hit-area path for us;
// we only need to add the moving dot on top of it.
export default function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
}) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? "rgb(var(--color-signal))" : "rgb(var(--color-line))",
          strokeWidth: selected ? 2.5 : 2,
          ...style,
        }}
      />
      <circle r="3.5" fill="rgb(var(--color-signal))">
        <animateMotion dur="1.8s" repeatCount="indefinite" path={edgePath} />
      </circle>
    </>
  );
}
