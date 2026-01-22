"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import { createStyles } from "antd-style";
import { Typography, Tag } from "antd";
import { FolderOutlined } from "@ant-design/icons";

import type { GroupNodeData } from "../types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  node: {
    background: token.colorBgContainer,
    border: `2px solid ${token.colorPrimaryBorder}`,
    borderRadius: token.borderRadiusLG,
    padding: 12,
    minWidth: 200,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    boxShadow: token.boxShadowTertiary,
    "&:hover": {
      borderColor: token.colorPrimary,
    },
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  icon: {
    color: token.colorPrimary,
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
    flexWrap: "wrap",
  },
  tag: {
    fontSize: 10,
    margin: 0,
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

type GroupNodeProps = NodeProps<Node<GroupNodeData, "group">>;

const GroupNodeComponent = ({ data }: GroupNodeProps) => {
  const { styles } = useStyles();
  const { group } = data as GroupNodeData;

  const itemCount = group.items.length;
  const minMax =
    group.minSelection || group.maxSelection
      ? `${group.minSelection ?? 0}-${group.maxSelection ?? "∞"}`
      : null;

  return (
    <div className={styles.node}>
      {/* Single target handle on left */}
      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
      />

      {/* Content */}
      <div className={styles.header}>
        <FolderOutlined className={styles.icon} />
        <Typography.Text className={styles.title}>{group.title}</Typography.Text>
      </div>
      <div className={styles.info}>
        <Tag className={styles.tag} color="blue">
          {itemCount} items
        </Tag>
        {group.isRequired && (
          <Tag className={styles.tag} color="red">
            Required
          </Tag>
        )}
        {minMax && (
          <Tag className={styles.tag} color="default">
            {minMax}
          </Tag>
        )}
      </div>

      {/* Single source handle on right */}
      <Handle
        type="source"
        position={Position.Right}
        className={styles.handle}
      />
    </div>
  );
};

export const GroupNode = memo(GroupNodeComponent);
export default GroupNode;
