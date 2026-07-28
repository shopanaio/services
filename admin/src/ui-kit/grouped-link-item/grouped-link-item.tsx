"use client";

import type { MouseEventHandler, ReactNode } from "react";
import Link from "next/link";
import { createStyles } from "antd-style";
import { LuChevronRight as RightOutlined } from "react-icons/lu";

const useStyles = createStyles(({ token }) => ({
  root: {
    position: "relative",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: 16,
    width: "100%",
    height: 64,
    minWidth: 0,
    padding: "10px 16px",
    overflow: "hidden",
    background: token.colorBgContainer,
  },
  overlay: {
    position: "absolute",
    zIndex: 0,
    inset: 0,
    width: "100%",
    height: "100%",
    padding: 0,
    color: "inherit",
    background: "transparent",
    border: 0,
    cursor: "pointer",
    font: "inherit",
    textAlign: "left",
    textDecoration: "none",
    transition: `background-color ${token.motionDurationMid}`,
    "&:hover": {
      background: token.colorFillQuaternary,
    },
    "&:focus-visible": {
      outline: `2px solid ${token.colorPrimaryBorder}`,
      outlineOffset: -2,
    },
  },
  leading: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flex: "0 0 auto",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  content: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flex: 1,
    flexDirection: "column",
    minWidth: 0,
    overflow: "hidden",
    pointerEvents: "none",
  },
  title: {
    overflow: "hidden",
    color: token.colorText,
    fontSize: 13,
    fontWeight: token.fontWeightStrong,
    lineHeight: "20px",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  description: {
    overflow: "hidden",
    color: token.colorTextSecondary,
    fontSize: 11,
    lineHeight: "18px",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  trailing: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flex: "0 0 auto",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  control: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    flex: "0 0 auto",
    alignItems: "center",
    justifyContent: "center",
  },
  chevron: {
    width: 14,
    height: 14,
    color: token.colorText,
  },
  divider: {
    width: "100%",
    height: 1,
    background: token.colorBorderSecondary,
  },
}));

export interface GroupedLinkItemProps {
  title: ReactNode;
  description: ReactNode;
  href?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  leading?: ReactNode;
  trailing?: ReactNode;
  control?: ReactNode;
  ariaLabel?: string;
  className?: string;
}

export function GroupedLinkItem({
  title,
  description,
  href,
  onClick,
  leading,
  trailing,
  control,
  ariaLabel,
  className,
}: GroupedLinkItemProps) {
  const { styles, cx } = useStyles();
  const accessibleLabel =
    ariaLabel ?? (typeof title === "string" ? title : undefined);
  const content = (
    <>
      {href ? (
        <Link
          aria-label={accessibleLabel}
          className={styles.overlay}
          href={href}
        />
      ) : onClick ? (
        <button
          aria-label={accessibleLabel}
          className={styles.overlay}
          onClick={onClick}
          type="button"
        />
      ) : null}
      {leading ? <span className={styles.leading}>{leading}</span> : null}
      <span className={styles.content}>
        <span className={styles.title}>{title}</span>
        <span className={styles.description}>{description}</span>
      </span>
      {control ? (
        <span
          className={styles.control}
          onClick={(event) => event.stopPropagation()}
        >
          {control}
        </span>
      ) : null}
      <span className={styles.trailing}>
        {trailing ?? <RightOutlined aria-hidden className={styles.chevron} />}
      </span>
    </>
  );

  return <div className={cx(styles.root, className)}>{content}</div>;
}

export function GroupedLinkItemDivider({
  className,
}: {
  className?: string;
}) {
  const { styles, cx } = useStyles();

  return <div aria-hidden className={cx(styles.divider, className)} />;
}
