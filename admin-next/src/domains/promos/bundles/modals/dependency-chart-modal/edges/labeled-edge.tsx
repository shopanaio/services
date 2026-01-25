"use client";

import { memo } from "react";
import { BaseEdge } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";

// ============================================================================
// Component
// ============================================================================

const SimpleEdgeComponent = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
}: EdgeProps) => {
  // Custom bezier path with strong curvature near the ends
  const dx = targetX - sourceX;
  const controlOffset = Math.min(Math.abs(dx) * 0.8, 100);

  // Control points: extend horizontally from source/target, creating a smooth S-curve
  const edgePath = `M ${sourceX} ${sourceY} C ${sourceX + controlOffset} ${sourceY}, ${targetX - controlOffset} ${targetY}, ${targetX} ${targetY}`;

  return (
    <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
  );
};

export const LabeledEdge = memo(SimpleEdgeComponent);
