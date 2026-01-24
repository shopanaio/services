"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import { createStyles } from "antd-style";
import { Typography } from "antd";
import { GiftOutlined } from "@ant-design/icons";

import type { BundleNodeData } from "../types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  node: {
    background: `linear-gradient(135deg, ${token.colorPrimaryBg} 0%, ${token.colorBgContainer} 100%)`,
    border: `2px solid ${token.colorPrimaryBorder}`,
    borderRadius: token.borderRadiusLG,
    padding: 16,
    minWidth: 100,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    boxShadow: token.boxShadow,
  },
  icon: {
    color: token.colorPrimary,
    fontSize: 28,
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: token.colorPrimary,
  },
  handle: {
    width: 8,
    height: 8,
    background: token.colorSuccess,
    border: "none",
  },
}));

// ============================================================================
// Component
// ============================================================================

type BundleNodeProps = NodeProps<Node<BundleNodeData, "bundle">>;

const BundleNodeComponent = ({ data }: BundleNodeProps) => {
  const { styles } = useStyles();
  const { label } = data;

  return (
    <div className={styles.node}>
      <Handle type="target" position={Position.Top} className={styles.handle} />

      <GiftOutlined className={styles.icon} />
      <Typography.Text className={styles.label}>{label}</Typography.Text>
    </div>
  );
};

export const BundleNode = memo(BundleNodeComponent);
