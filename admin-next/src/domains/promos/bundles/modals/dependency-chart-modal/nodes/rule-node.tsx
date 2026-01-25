"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import { createStyles } from "antd-style";
import { Typography, Badge, Tag } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";

import type { RuleNodeData } from "../types";
import { NODE_DIMENSIONS } from "../constants";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  node: {
    background: token.colorBgContainer,
    border: `2px solid ${token.colorWarning}`,
    borderRadius: token.borderRadiusLG,
    padding: `${token.paddingSM}px ${token.paddingSM}px`,
    width: NODE_DIMENSIONS.rule.width,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    transition: "all 0.2s ease",
    cursor: "pointer",
    gap: 8,
    "&:hover": {
      boxShadow: token.boxShadowSecondary,
    },
  },
  nodeSelected: {
    border: `2px solid ${token.colorPrimary}`,
    boxShadow: token.boxShadowSecondary,
  },
  nodeDisabled: {
    opacity: 0.5,
    borderColor: token.colorBorder,
  },
  nodeDimmed: {
    opacity: 0.5,
    filter: "grayscale(30%)",
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
  priorityTag: {
    "&&": {
      fontSize: 10,
      lineHeight: "16px",
      padding: "0 4px",
      margin: 0,
      fontFamily: "monospace",
    },
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

const RuleNodeComponent = ({ data, selected }: RuleNodeProps) => {
  const { styles, cx } = useStyles();
  const { rule, isDimmed } = data;

  const conditionCount = rule.conditionGroups.reduce(
    (sum, g) => sum + g.conditions.length,
    0,
  );
  const actionCount = rule.actions.length;

  return (
    <div
      className={cx(
        styles.node,
        selected && styles.nodeSelected,
        !rule.enabled && styles.nodeDisabled,
        isDimmed && styles.nodeDimmed,
      )}
    >
      <Handle type="target" position={Position.Left} className={styles.handle} />

      <div className={styles.header}>
        <ThunderboltOutlined className={styles.icon} />
        <Typography.Text className={styles.title}>
          {rule.name || "Unnamed Rule"}
        </Typography.Text>
      </div>
      <div className={styles.info}>
        <Tag color="orange" className={styles.priorityTag}>
          #{rule.priority}
        </Tag>
        <Typography.Text type="secondary" className={styles.conditionCount}>
          {conditionCount} when → {actionCount} then
        </Typography.Text>
        {!rule.enabled && <Badge status="default" text="" />}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className={styles.handle}
      />
    </div>
  );
};

export const RuleNode = memo(RuleNodeComponent);
