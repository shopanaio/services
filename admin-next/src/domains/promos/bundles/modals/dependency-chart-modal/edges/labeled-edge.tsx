"use client";

import { memo } from "react";
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";
import { Tag } from "antd";
import { createStyles } from "antd-style";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(() => ({
  labelContainer: {
    position: "absolute",
    pointerEvents: "all",
    transform: "translate(-50%, -50%)",
  },
  tag: {
    margin: 0,
    fontSize: 10,
    lineHeight: 1.4,
    padding: "2px 6px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 1,
  },
}));

// ============================================================================
// Types
// ============================================================================

interface LabeledEdgeData {
  labels?: string[];
  tagColor?: string;
}

// ============================================================================
// Component
// ============================================================================

const LabeledEdgeComponent = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  data,
  markerEnd,
}: EdgeProps) => {
  const { styles } = useStyles();

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  const edgeData = data as LabeledEdgeData | undefined;
  const labels = edgeData?.labels ?? [];
  const tagColor = edgeData?.tagColor ?? "default";

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {labels.length > 0 && (
        <EdgeLabelRenderer>
          <div
            className={styles.labelContainer}
            style={{
              left: labelX,
              top: labelY,
              opacity: style?.opacity ?? 1,
              transition: "opacity 0.2s ease",
            }}
          >
            <Tag className={styles.tag} color={tagColor} variant="outlined">
              {labels.map((label, index) => (
                <span key={index}>{label}</span>
              ))}
            </Tag>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export const LabeledEdge = memo(LabeledEdgeComponent);
