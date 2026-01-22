"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import { createStyles } from "antd-style";
import { Typography, Avatar, Tag } from "antd";
import { AppstoreOutlined } from "@ant-design/icons";

import type { ItemNodeData } from "../types";
import { ITEM_HANDLES } from "../types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  node: {
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    padding: 8,
    minWidth: 180,
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
    width: 10,
    height: 10,
    background: token.colorPrimary,
    border: `2px solid ${token.colorBgContainer}`,
  },
  handleLeft: {
    left: -5,
  },
  handleRight: {
    right: -5,
  },
}));

// ============================================================================
// Component
// ============================================================================

type ItemNodeProps = NodeProps<Node<ItemNodeData, "item">>;

const ItemNodeComponent = ({ data }: ItemNodeProps) => {
  const { styles } = useStyles();
  const { item, groupTitle } = data as ItemNodeData;

  const title =
    item.title ??
    item.assignedProduct?.title ??
    item.assignedVariant?.title ??
    "Unnamed Item";

  const imageUrl =
    item.featuredImage?.url ??
    (item.assignedProduct as any)?.featuredImage?.url ??
    (item.assignedVariant?.product as any)?.featuredImage?.url;

  return (
    <div className={styles.node}>
      {/* Left handles (for incoming actions) */}
      <Handle
        type="target"
        position={Position.Left}
        id={ITEM_HANDLES.ACT_AVAILABILITY}
        className={`${styles.handle} ${styles.handleLeft}`}
        style={{ top: "30%" }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id={ITEM_HANDLES.ACT_VISIBILITY}
        className={`${styles.handle} ${styles.handleLeft}`}
        style={{ top: "50%" }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id={ITEM_HANDLES.ACT_PRICE}
        className={`${styles.handle} ${styles.handleLeft}`}
        style={{ top: "70%" }}
      />

      {/* Content */}
      <Avatar
        size={32}
        src={imageUrl}
        icon={<AppstoreOutlined />}
        className={styles.avatar}
      />
      <div className={styles.content}>
        <Typography.Text className={styles.title}>{title}</Typography.Text>
        <Tag className={styles.groupTag} color="default">
          {groupTitle}
        </Tag>
      </div>

      {/* Right handles (for outgoing conditions) */}
      <Handle
        type="source"
        position={Position.Right}
        id={ITEM_HANDLES.COND_SELECTED}
        className={`${styles.handle} ${styles.handleRight}`}
        style={{ top: "30%" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id={ITEM_HANDLES.COND_NOT_SELECTED}
        className={`${styles.handle} ${styles.handleRight}`}
        style={{ top: "50%" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id={ITEM_HANDLES.COND_QTY}
        className={`${styles.handle} ${styles.handleRight}`}
        style={{ top: "70%" }}
      />
    </div>
  );
};

export const ItemNode = memo(ItemNodeComponent);
export default ItemNode;
