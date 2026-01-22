"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import { createStyles } from "antd-style";
import { Typography, Badge } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";

import type { RuleNodeData } from "../types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  node: {
    background: token.colorBgContainer,
    border: `2px solid ${token.colorWarning}`,
    borderRadius: token.borderRadiusLG,
    padding: 12,
    minWidth: 180,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    boxShadow: token.boxShadowTertiary,
    transition: "box-shadow 0.2s ease",
    cursor: "pointer",
    "&:hover": {
      boxShadow: token.boxShadow,
    },
  },
  nodeSelected: {
    boxShadow: token.boxShadow,
  },
  nodeDisabled: {
    opacity: 0.5,
    borderColor: token.colorBorder,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  icon: {
    color: token.colorWarning,
    fontSize: 16,
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  info: {
    display: "flex",
    gap: 6,
    alignItems: "center",
  },
  conditionCount: {
    fontSize: 11,
  },
  handle: {
    width: 8,
    height: 8,
    background: token.colorWarning,
    border: "none",
  },
}));

// ============================================================================
// Component
// ============================================================================

type RuleNodeProps = NodeProps<Node<RuleNodeData, "rule">>;

const RuleNodeComponent = ({ data }: RuleNodeProps) => {
  const { styles, cx } = useStyles();
  const { rule, isSelected } = data as RuleNodeData;

  const conditionCount = rule.conditions.length;
  const actionCount = rule.actions.length;

  return (
    <div
      className={cx(
        styles.node,
        isSelected && styles.nodeSelected,
        !rule.enabled && styles.nodeDisabled
      )}
    >
      {/* Target handle on top (from source items) */}
      <Handle
        type="target"
        position={Position.Top}
        className={styles.handle}
      />

      {/* Content */}
      <div className={styles.header}>
        <ThunderboltOutlined className={styles.icon} />
        <Typography.Text className={styles.title}>
          {rule.name || "Unnamed Rule"}
        </Typography.Text>
      </div>
      <div className={styles.info}>
        <Typography.Text type="secondary" className={styles.conditionCount}>
          {conditionCount} when → {actionCount} then
        </Typography.Text>
        {!rule.enabled && (
          <Badge status="default" text="" />
        )}
      </div>

      {/* Source handle on bottom (to target items) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={styles.handle}
      />
    </div>
  );
};

export const RuleNode = memo(RuleNodeComponent);
export default RuleNode;
