"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import { createStyles } from "antd-style";
import { Typography } from "antd";

import type { HubNodeData } from "../types";
import { NODE_DIMENSIONS } from "../constants";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  node: {
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorder}`,
    borderRadius: token.borderRadiusSM,
    padding: "2px 6px",
    minWidth: NODE_DIMENSIONS.hub.width,
    height: NODE_DIMENSIONS.hub.height,
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    transition: "all 0.2s ease",
    "&:hover": {
      boxShadow: token.boxShadowTertiary,
    },
  },
  nodeCondition: {
    borderColor: token.colorPrimary,
    background: token.colorPrimaryBg,
  },
  nodeAction: {
    borderColor: token.colorSuccess,
    background: token.colorSuccessBg,
  },
  nodeDisabled: {
    borderColor: token.colorBorder,
    background: token.colorBgContainerDisabled,
    opacity: 0.7,
  },
  nodeSelected: {
    boxShadow: token.boxShadowTertiary,
  },
  nodeDimmed: {
    opacity: 0.4,
    filter: "grayscale(50%)",
  },
  label: {
    fontSize: 10,
    lineHeight: 1,
    textAlign: "center",
    color: token.colorText,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
  },
  labelCondition: {
    color: token.colorPrimary,
  },
  labelAction: {
    color: token.colorSuccess,
  },
  labelDisabled: {
    color: token.colorTextDisabled,
  },
  moreLabel: {
    fontSize: 9,
    color: token.colorTextSecondary,
  },
  handle: {
    width: 5,
    height: 5,
    border: "none",
  },
  handleCondition: {
    background: token.colorPrimary,
  },
  handleAction: {
    background: token.colorSuccess,
  },
  handleDisabled: {
    background: token.colorBorder,
  },
}));

// ============================================================================
// Component
// ============================================================================

type HubNodeProps = NodeProps<Node<HubNodeData, "hub">>;

const HubNodeComponent = ({ data, selected }: HubNodeProps) => {
  const { styles, cx } = useStyles();
  const { hubType, labels, isEnabled = true, isDimmed } = data;

  const isCondition = hubType === "condition";
  // Show only first label for compact view
  const displayLabel = labels[0] || "";

  return (
    <div
      className={cx(
        styles.node,
        isCondition ? styles.nodeCondition : styles.nodeAction,
        !isEnabled && styles.nodeDisabled,
        selected && styles.nodeSelected,
        isDimmed && styles.nodeDimmed
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={cx(
          styles.handle,
          isCondition ? styles.handleCondition : styles.handleAction,
          !isEnabled && styles.handleDisabled
        )}
      />

      <Typography.Text
        className={cx(
          styles.label,
          isCondition ? styles.labelCondition : styles.labelAction,
          !isEnabled && styles.labelDisabled
        )}
      >
        {displayLabel}
      </Typography.Text>

      <Handle
        type="source"
        position={Position.Right}
        className={cx(
          styles.handle,
          isCondition ? styles.handleCondition : styles.handleAction,
          !isEnabled && styles.handleDisabled
        )}
      />
    </div>
  );
};

export const HubNode = memo(HubNodeComponent);
