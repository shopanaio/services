"use client";

import { memo } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";
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

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Get all labels and tag color for this edge
  const edgeData = data as { labels?: string[]; tagColor?: string } | undefined;
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

export default LabeledEdge;
