"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import { createStyles } from "antd-style";
import { Typography } from "antd";
import { GiftOutlined } from "@ant-design/icons";

import type { BundleNodeData } from "../types";
import { BUNDLE_HANDLES } from "../types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  node: {
    background: `linear-gradient(135deg, ${token.colorPrimaryBg} 0%, ${token.colorBgContainer} 100%)`,
    border: `2px solid ${token.colorPrimaryBorder}`,
    borderRadius: token.borderRadiusLG,
    padding: 12,
    minWidth: 120,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    boxShadow: token.boxShadow,
  },
  icon: {
    color: token.colorPrimary,
    fontSize: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: token.colorPrimary,
  },
  handle: {
    width: 12,
    height: 12,
    background: token.colorSuccess,
    border: `2px solid ${token.colorBgContainer}`,
  },
  handleLeft: {
    left: -6,
  },
}));

// ============================================================================
// Component
// ============================================================================

type BundleNodeProps = NodeProps<Node<BundleNodeData, "bundle">>;

const BundleNodeComponent = ({ data }: BundleNodeProps) => {
  const { styles } = useStyles();
  const { label } = data as BundleNodeData;

  return (
    <div className={styles.node}>
      {/* Left handle (for incoming actions) */}
      <Handle
        type="target"
        position={Position.Left}
        id={BUNDLE_HANDLES.ACT_PRICE}
        className={`${styles.handle} ${styles.handleLeft}`}
        style={{ top: "50%" }}
      />

      {/* Content */}
      <GiftOutlined className={styles.icon} />
      <Typography.Text className={styles.label}>{label}</Typography.Text>
    </div>
  );
};

export const BundleNode = memo(BundleNodeComponent);
export default BundleNode;
