"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import { createStyles } from "antd-style";
import { Typography, Tag } from "antd";
import { FolderOutlined } from "@ant-design/icons";

import type { GroupNodeData } from "../types";
import { GROUP_HANDLES } from "../types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  node: {
    background: token.colorBgContainer,
    border: `1px solid ${token.colorPrimaryBorder}`,
    borderRadius: token.borderRadiusLG,
    padding: 10,
    minWidth: 180,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    boxShadow: token.boxShadowTertiary,
    "&:hover": {
      borderColor: token.colorPrimary,
    },
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  icon: {
    color: token.colorPrimary,
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
    flexWrap: "wrap",
  },
  tag: {
    fontSize: 10,
    margin: 0,
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
      {/* Left handles (for incoming actions) */}
      <Handle
        type="target"
        position={Position.Left}
        id={GROUP_HANDLES.ACT_AVAILABILITY}
        className={`${styles.handle} ${styles.handleLeft}`}
        style={{ top: "35%" }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id={GROUP_HANDLES.ACT_VISIBILITY}
        className={`${styles.handle} ${styles.handleLeft}`}
        style={{ top: "65%" }}
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

      {/* Right handles (for outgoing conditions) */}
      <Handle
        type="source"
        position={Position.Right}
        id={GROUP_HANDLES.COND_VALID}
        className={`${styles.handle} ${styles.handleRight}`}
        style={{ top: "25%" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id={GROUP_HANDLES.COND_INVALID}
        className={`${styles.handle} ${styles.handleRight}`}
        style={{ top: "45%" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id={GROUP_HANDLES.COND_COUNT_UNIQUE}
        className={`${styles.handle} ${styles.handleRight}`}
        style={{ top: "65%" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id={GROUP_HANDLES.COND_COUNT_TOTAL}
        className={`${styles.handle} ${styles.handleRight}`}
        style={{ top: "85%" }}
      />
    </div>
  );
};

export const GroupNode = memo(GroupNodeComponent);
export default GroupNode;
