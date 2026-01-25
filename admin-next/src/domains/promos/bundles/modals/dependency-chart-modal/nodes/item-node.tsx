"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import { createStyles } from "antd-style";
import { Typography, Avatar } from "antd";
import { PictureOutlined, FolderOutlined } from "@ant-design/icons";

import type { ItemNodeData } from "../types";
import { NODE_DIMENSIONS } from "../constants";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  node: {
    background: token.colorBgContainer,
    border: `2px solid ${token.colorBorder}`,
    borderRadius: token.borderRadiusLG,
    padding: `${token.paddingSM}px ${token.paddingSM}px`,
    width: NODE_DIMENSIONS.item.width,
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: 8,
    transition: "all 0.2s ease",
    "&:hover": {
      boxShadow: token.boxShadowTertiary,
    },
  },
  nodeSelected: {
    borderColor: token.colorPrimary,
    boxShadow: token.boxShadowTertiary,
  },
  nodeHighlighted: {
    boxShadow: token.boxShadowTertiary,
  },
  nodeDimmed: {
    opacity: 0.5,
    filter: "grayscale(30%)",
  },
  avatar: {
    flexShrink: 0,
  },
  avatarGroup: {
    backgroundColor: token.colorPrimary,
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
// Helpers
// ============================================================================

interface ItemWithProduct {
  title?: string | null;
  assignedProduct?: {
    title?: string | null;
    featuredImage?: { url?: string | null } | null;
  } | null;
  assignedVariant?: {
    title?: string | null;
    featuredImage?: { url?: string | null } | null;
    product?: {
      title?: string | null;
      featuredImage?: { url?: string | null } | null;
    } | null;
  } | null;
  featuredImage?: { url?: string | null } | null;
}

const getProductTitle = (item: ItemWithProduct): string => {
  return (
    item.title ??
    item.assignedProduct?.title ??
    item.assignedVariant?.product?.title ??
    "Unnamed"
  );
};

const getVariantTitle = (item: ItemWithProduct): string | undefined => {
  return item.assignedVariant?.title ?? undefined;
};

const getImageUrl = (item: ItemWithProduct): string | undefined => {
  return (
    item.featuredImage?.url ??
    item.assignedProduct?.featuredImage?.url ??
    item.assignedVariant?.featuredImage?.url ??
    item.assignedVariant?.product?.featuredImage?.url ??
    undefined
  );
};

// ============================================================================
// Component
// ============================================================================

type ItemNodeProps = NodeProps<Node<ItemNodeData, "item">>;

const ItemNodeComponent = ({ data, selected }: ItemNodeProps) => {
  const { styles, cx } = useStyles();
  const { item, groupTitle, position: nodePosition, isGroup, isDimmed, isHighlighted } = data;

  const productTitle = getProductTitle(item as ItemWithProduct);
  const variantTitle = !isGroup ? getVariantTitle(item as ItemWithProduct) : undefined;
  const imageUrl = !isGroup ? getImageUrl(item as ItemWithProduct) : undefined;

  // Source: right handle only (to hub)
  // Target: left handle only (from hub)
  const showLeftHandle = nodePosition === "target";
  const showRightHandle = nodePosition === "source";

  return (
    <div className={cx(styles.node, selected && styles.nodeSelected, isHighlighted && styles.nodeHighlighted, isDimmed && styles.nodeDimmed)}>
      {showLeftHandle && (
        <Handle type="target" position={Position.Left} className={styles.handle} />
      )}

      <Avatar
        size={40}
        src={imageUrl}
        icon={isGroup ? <FolderOutlined /> : <PictureOutlined />}
        className={cx(styles.avatar, isGroup && styles.avatarGroup)}
      />
      <div className={styles.content}>
        <Typography.Text className={styles.groupTitle}>{groupTitle}</Typography.Text>
        <Typography.Text className={styles.title}>{productTitle}</Typography.Text>
        {variantTitle && (
          <Typography.Text className={styles.variantTitle}>{variantTitle}</Typography.Text>
        )}
      </div>

      {showRightHandle && (
        <Handle type="source" position={Position.Right} className={styles.handle} />
      )}
    </div>
  );
};

export const ItemNode = memo(ItemNodeComponent);
