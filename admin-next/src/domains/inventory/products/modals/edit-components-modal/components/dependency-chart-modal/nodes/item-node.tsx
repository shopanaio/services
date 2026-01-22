"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import { createStyles } from "antd-style";
import { Typography, Avatar, Tag } from "antd";
import { AppstoreOutlined, FolderOutlined } from "@ant-design/icons";

import type { ItemNodeData } from "../types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  node: {
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    padding: 8,
    minWidth: 200,
    display: "flex",
    alignItems: "center",
    gap: 8,
    boxShadow: token.boxShadowTertiary,
    "&:hover": {
      borderColor: token.colorPrimary,
    },
  },
  avatar: {
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
  },
  title: {
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1.3,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  groupTag: {
    fontSize: 10,
    marginTop: 2,
  },
  handle: {
    width: 8,
    height: 8,
    background: token.colorPrimary,
    border: "none",
  },
}));

// ============================================================================
// Component
// ============================================================================

type ItemNodeProps = NodeProps<Node<ItemNodeData, "item">>;

const ItemNodeComponent = ({ data }: ItemNodeProps) => {
  const { styles } = useStyles();
  const { item, groupTitle, position: nodePosition, isGroup } = data as ItemNodeData;

  const title = item.title ?? (item as any).assignedProduct?.title ?? (item as any).assignedVariant?.title ?? "Unnamed";

  const imageUrl = !isGroup
    ? ((item as any).featuredImage?.url ??
      (item as any).assignedProduct?.featuredImage?.url ??
      (item as any).assignedVariant?.product?.featuredImage?.url)
    : undefined;

  // Source: bottom handle only (to rule)
  // Target: top handle only (from rule)
  const showTopHandle = !nodePosition || nodePosition === "target";
  const showBottomHandle = !nodePosition || nodePosition === "source";

  return (
    <div className={styles.node}>
      {showTopHandle && (
        <Handle type="target" position={Position.Top} className={styles.handle} />
      )}

      <Avatar
        size={32}
        src={imageUrl}
        icon={isGroup ? <FolderOutlined /> : <AppstoreOutlined />}
        className={styles.avatar}
        style={isGroup ? { backgroundColor: "#1890ff" } : undefined}
      />
      <div className={styles.content}>
        <Typography.Text className={styles.title}>{title}</Typography.Text>
        <Tag className={styles.groupTag} color={isGroup ? "blue" : "default"}>
          {groupTitle}
        </Tag>
      </div>

      {showBottomHandle && (
        <Handle type="source" position={Position.Bottom} className={styles.handle} />
      )}
    </div>
  );
};

export const ItemNode = memo(ItemNodeComponent);
export default ItemNode;
