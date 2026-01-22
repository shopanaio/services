"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import { createStyles } from "antd-style";
import { Typography, Tag, Badge } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";

import type { RuleNodeData } from "../types";
import { RULE_HANDLES } from "../types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  node: {
    background: token.colorBgContainer,
    border: `2px solid ${token.colorWarningBorder}`,
    borderRadius: token.borderRadiusLG,
    padding: 10,
    minWidth: 160,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    boxShadow: token.boxShadowTertiary,
    transition: "all 0.2s ease",
    cursor: "pointer",
    "&:hover": {
      borderColor: token.colorWarning,
      boxShadow: token.boxShadow,
    },
  },
  nodeSelected: {
    borderColor: token.colorPrimary,
    boxShadow: `0 0 0 2px ${token.colorPrimaryBg}`,
  },
  nodeDisabled: {
    opacity: 0.5,
    borderColor: token.colorBorder,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  icon: {
    color: token.colorWarning,
    fontSize: 14,
  },
  title: {
    fontSize: 12,
    fontWeight: 600,
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  info: {
    display: "flex",
    gap: 4,
    alignItems: "center",
  },
  priorityTag: {
    fontSize: 10,
    fontFamily: "monospace",
    margin: 0,
  },
  conditionCount: {
    fontSize: 10,
  },
  handle: {
    width: 12,
    height: 12,
    background: token.colorWarning,
    border: `2px solid ${token.colorBgContainer}`,
  },
  handleLeft: {
    left: -6,
  },
  handleRight: {
    right: -6,
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
      {/* Left handle (for incoming conditions) */}
      <Handle
        type="target"
        position={Position.Left}
        id={RULE_HANDLES.INPUT}
        className={`${styles.handle} ${styles.handleLeft}`}
        style={{ top: "50%" }}
      />

      {/* Content */}
      <div className={styles.header}>
        <ThunderboltOutlined className={styles.icon} />
        <Typography.Text className={styles.title}>
          {rule.name || "Unnamed Rule"}
        </Typography.Text>
      </div>
      <div className={styles.info}>
        <Tag className={styles.priorityTag} color="orange">
          P{rule.priority}
        </Tag>
        <Typography.Text type="secondary" className={styles.conditionCount}>
          {conditionCount} when → {actionCount} then
        </Typography.Text>
        {!rule.enabled && (
          <Badge status="default" text="" />
        )}
      </div>

      {/* Right handle (for outgoing actions) */}
      <Handle
        type="source"
        position={Position.Right}
        id={RULE_HANDLES.OUTPUT}
        className={`${styles.handle} ${styles.handleRight}`}
        style={{ top: "50%" }}
      />
    </div>
  );
};

export const RuleNode = memo(RuleNodeComponent);
export default RuleNode;
