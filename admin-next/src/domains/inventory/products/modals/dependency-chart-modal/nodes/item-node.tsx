"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import { createStyles } from "antd-style";
import { Typography, Avatar } from "antd";
import { PictureOutlined, FolderOutlined } from "@ant-design/icons";

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
  },
  avatar: {
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  groupTitle: {
    fontSize: token.fontSizeSM,
    color: token.colorTextSecondary,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  title: {
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1.3,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  variantTitle: {
    fontSize: token.fontSizeSM,
    color: token.colorPrimary,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
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

  // Get product title
  const productTitle =
    item.title ??
    (item as any).assignedProduct?.title ??
    (item as any).assignedVariant?.product?.title ??
    "Unnamed";

  // Get variant title (only if assignedVariant exists)
  const variantTitle = (item as any).assignedVariant?.title as string | undefined;

  // Get featured image
  const imageUrl = !isGroup
    ? ((item as any).featuredImage?.url ??
        (item as any).assignedProduct?.featuredImage?.url ??
        (item as any).assignedVariant?.featuredImage?.url ??
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
        size={40}
        src={imageUrl}
        icon={isGroup ? <FolderOutlined /> : <PictureOutlined />}
        className={styles.avatar}
        style={isGroup ? { backgroundColor: "#1890ff" } : undefined}
      />
      <div className={styles.content}>
        <Typography.Text className={styles.groupTitle}>{groupTitle}</Typography.Text>
        <Typography.Text className={styles.title}>{productTitle}</Typography.Text>
        {variantTitle && (
          <Typography.Text className={styles.variantTitle}>{variantTitle}</Typography.Text>
        )}
      </div>

      {showBottomHandle && (
        <Handle type="source" position={Position.Bottom} className={styles.handle} />
      )}
    </div>
  );
};

export const ItemNode = memo(ItemNodeComponent);
export default ItemNode;
