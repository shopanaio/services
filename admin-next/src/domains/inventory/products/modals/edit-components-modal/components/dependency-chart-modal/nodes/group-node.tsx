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
    border: `1px solid ${token.colorPrimaryBorder}`,
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
  icon: {
    color: token.colorPrimary,
    fontSize: 24,
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
  tag: {
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

type GroupNodeProps = NodeProps<Node<GroupNodeData, "group">>;

const GroupNodeComponent = ({ data }: GroupNodeProps) => {
  const { styles } = useStyles();
  const { group, position: nodePosition } = data as GroupNodeData;

  const itemCount = group.items.length;

  // Source groups: bottom handle only (to rule)
  // Target groups: top handle only (from rule)
  const showTopHandle = !nodePosition || nodePosition === "target";
  const showBottomHandle = !nodePosition || nodePosition === "source";

  return (
    <div className={styles.node}>
      {/* Target handle on top */}
      {showTopHandle && (
        <Handle
          type="target"
          position={Position.Top}
          className={styles.handle}
        />
      )}

      {/* Content */}
      <FolderOutlined className={styles.icon} />
      <div className={styles.content}>
        <Typography.Text className={styles.title}>{group.title}</Typography.Text>
        <Tag className={styles.tag} color="blue">
          {itemCount} items
        </Tag>
      </div>

      {/* Source handle on bottom */}
      {showBottomHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          className={styles.handle}
        />
      )}
    </div>
  );
};

export const GroupNode = memo(GroupNodeComponent);
export default GroupNode;
