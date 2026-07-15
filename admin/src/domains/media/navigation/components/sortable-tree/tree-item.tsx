"use client";

import { forwardRef, type CSSProperties, type HTMLAttributes } from "react";
import { Button, Typography } from "antd";
import { HiChevronDown, HiChevronRight } from "react-icons/hi";
import { MdClose, MdDragIndicator, MdEdit } from "react-icons/md";
import { createStyles } from "antd-style";

export interface TreeItemProps
  extends Omit<HTMLAttributes<HTMLLIElement>, "id" | "content"> {
  title: string;
  childCount?: number;
  clone?: boolean;
  collapsed?: boolean;
  depth: number;
  disableInteraction?: boolean;
  ghost?: boolean;
  handleProps?: Record<string, unknown>;
  indicator?: boolean;
  indentationWidth: number;
  onCollapse?: () => void;
  onRemove?: () => void;
  onEdit?: () => void;
  wrapperRef?: (node: HTMLLIElement | null) => void;
}

const useStyles = createStyles(() => ({
  wrapper: {
    listStyle: "none",
    boxSizing: "border-box",
    marginBottom: -1,
    minWidth: 500,
  },
  item: {
    "--vertical-padding": "10px",
    position: "relative",
    display: "flex",
    alignItems: "center",
    padding: "var(--vertical-padding) 10px",
    background: "#fff",
    border: "1px solid #dedede",
    color: "#222",
    boxSizing: "border-box",
    gap: 4,
  },
  title: { paddingLeft: 4, flexGrow: 1 },
  collapseButton: { marginRight: 4 },
  clone: {
    display: "inline-block",
    pointerEvents: "none",
    padding: "5px 0 0 10px !important",
    "& > div": {
      opacity: 0.85,
      "--vertical-padding": "5px",
      paddingRight: 24,
      borderRadius: 4,
      boxShadow: "0 15px 15px 0 rgba(34, 33, 81, 0.1)",
    },
  },
  ghost: { opacity: 0.5 },
  indicator: {
    opacity: "1 !important",
    position: "relative",
    zIndex: 1,
    marginBottom: -1,
    "& > div": {
      position: "relative",
      height: 8,
      padding: 0,
      borderColor: "#2389ff",
      background: "#56a1f8",
      "&::before": {
        position: "absolute",
        left: -8,
        top: -4,
        display: "block",
        content: '""',
        width: 12,
        height: 12,
        borderRadius: "50%",
        border: "1px solid #2389ff",
        background: "#fff",
      },
      "& > *": { opacity: 0, height: 0 },
    },
  },
  disabled: { pointerEvents: "none" },
  count: {
    position: "absolute",
    top: -10,
    right: -10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "#1677ff",
    color: "#fff",
    fontSize: 12,
    fontWeight: 500,
  },
}));

export const TreeItem = forwardRef<HTMLDivElement, TreeItemProps>(
  (
    {
      childCount,
      clone,
      collapsed,
      depth,
      disableInteraction,
      ghost,
      handleProps,
      indentationWidth,
      indicator,
      onCollapse,
      onEdit,
      onRemove,
      style,
      title,
      wrapperRef,
      ...props
    },
    ref,
  ) => {
    const { styles, cx } = useStyles();
    return (
      <li
        ref={wrapperRef}
        className={cx(
          styles.wrapper,
          clone && styles.clone,
          ghost && styles.ghost,
          indicator && ghost && styles.indicator,
          disableInteraction && styles.disabled,
        )}
        style={{ paddingLeft: indentationWidth * depth } as CSSProperties}
        {...props}
      >
        <div ref={ref} className={styles.item} style={style}>
          <Button
            size="large"
            type="text"
            data-testid="tree-item-drag-handle"
            icon={<MdDragIndicator size={20} />}
            {...handleProps}
          />
          {onCollapse ? (
            <Button
              size="large"
              type="text"
              onClick={onCollapse}
              className={styles.collapseButton}
              data-testid={`tree-item-${collapsed ? "expand" : "collapse"}-button`}
              icon={collapsed ? <HiChevronRight size={18} /> : <HiChevronDown size={18} />}
            />
          ) : null}
          <Typography.Text
            ellipsis
            className={styles.title}
            data-testid="tree-item-title"
          >
            {title || "Untitled item..."}
          </Typography.Text>
          {!clone && onEdit ? (
            <Button
              size="large"
              type="text"
              data-testid="tree-item-edit-button"
              icon={<MdEdit size={20} />}
              onClick={onEdit}
            />
          ) : null}
          {!clone && onRemove ? (
            <Button
              size="large"
              type="text"
              data-testid="tree-item-delete-button"
              icon={<MdClose size={20} />}
              onClick={onRemove}
            />
          ) : null}
          {clone && childCount && childCount > 1 ? (
            <span className={styles.count}>{childCount}</span>
          ) : null}
        </div>
      </li>
    );
  },
);

TreeItem.displayName = "TreeItem";
