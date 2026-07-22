"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { createStyles } from "antd-style";

const useStyles = createStyles(({ token }) => ({
  root: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    height: 64,
    minWidth: 0,
    padding: 12,
    overflow: "hidden",
    color: token.colorText,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: 8,
  },
  interactive: {
    cursor: "pointer",
    transition: `background-color ${token.motionDurationMid}, border-color ${token.motionDurationMid}`,
    "&:hover": { background: token.colorFillQuaternary, borderColor: token.colorBorder },
    "&:focus-visible": { outline: `2px solid ${token.colorPrimaryBorder}`, outlineOffset: 2 },
  },
  icon: {
    display: "grid",
    flex: "0 0 auto",
    placeItems: "center",
    width: 20,
    height: 20,
    fontSize: 20,
    "& > svg": { width: 20, height: 20 },
  },
  copy: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
    overflow: "hidden",
    whiteSpace: "nowrap",
  },
  label: {
    overflow: "hidden",
    fontSize: 13,
    fontWeight: 600,
    lineHeight: "19px",
    textOverflow: "ellipsis",
  },
  value: {
    overflow: "hidden",
    color: token.colorTextSecondary,
    fontSize: 12,
    lineHeight: "18px",
    textOverflow: "ellipsis",
  },
  trailing: { display: "flex", flex: "0 0 auto", alignItems: "center" },
}));

export interface SettingsItemTileProps {
  icon: ReactNode;
  label: ReactNode;
  value: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
  dataTestId?: string;
}

export const SettingsItemTile = ({
  icon,
  label,
  value,
  trailing,
  onClick,
  ariaLabel,
  className,
  dataTestId,
}: SettingsItemTileProps) => {
  const { styles, cx } = useStyles();

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick || event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onClick();
  };

  return (
    <div
      aria-label={ariaLabel}
      className={cx(styles.root, onClick && styles.interactive, className)}
      data-testid={dataTestId}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <span className={styles.icon}>{icon}</span>
      <span className={styles.copy}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
      </span>
      {trailing ? <span className={styles.trailing}>{trailing}</span> : null}
    </div>
  );
};
