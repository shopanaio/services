"use client";

import { Card, Typography } from "antd";
import { createStyles } from "antd-style";
import type { Key, ReactNode } from "react";

const useStyles = createStyles(({ token }) => ({
  card: {
    overflow: "hidden",
    boxShadow: token.boxShadowTertiary,
    ".ant-card-body": { padding: 0 },
  },
  row: {
    appearance: "none",
    width: "100%",
    border: 0,
    background: token.colorBgContainer,
    color: "inherit",
    display: "grid",
    gridTemplateColumns: "44px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: token.padding,
    minHeight: 80,
    padding: `${token.padding}px ${token.paddingLG}px`,
    textAlign: "left",
    "& + &": { borderTop: `1px solid ${token.colorBorderSecondary}` },
    [`@media (max-width: ${token.screenSM}px)`]: {
      gridTemplateColumns: "40px minmax(0, 1fr)",
      minHeight: 72,
      padding: token.padding,
    },
  },
  clickable: {
    cursor: "pointer",
    transition: `background-color ${token.motionDurationMid}`,
    "&:hover": { background: token.colorFillQuaternary },
    "&:focus-visible": {
      outline: `2px solid ${token.colorPrimary}`,
      outlineOffset: -2,
    },
  },
  disabled: {
    cursor: "not-allowed",
    opacity: 0.55,
  },
  noIcon: {
    gridTemplateColumns: "minmax(0, 1fr) auto",
    [`@media (max-width: ${token.screenSM}px)`]: {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: token.colorFillQuaternary,
    color: token.colorTextSecondary,
    display: "grid",
    placeItems: "center",
    fontSize: 18,
    [`@media (max-width: ${token.screenSM}px)`]: {
      width: 40,
      height: 40,
      fontSize: 16,
    },
  },
  copy: { minWidth: 0 },
  title: { display: "block", fontSize: token.fontSizeLG },
  description: { display: "block", marginTop: token.marginXXS },
  content: { marginTop: token.marginSM },
  trailing: {
    whiteSpace: "nowrap",
    [`@media (max-width: ${token.screenSM}px)`]: {
      gridColumn: "2",
      justifySelf: "start",
    },
  },
  trailingNoIcon: {
    [`@media (max-width: ${token.screenSM}px)`]: { gridColumn: "1" },
  },
}));

export interface SectionNavigatorItem {
  key: Key;
  title: ReactNode;
  description?: ReactNode;
  content?: ReactNode;
  icon?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  testId?: string;
}

interface SectionNavigatorProps {
  items: SectionNavigatorItem[];
  className?: string;
  testId?: string;
}

export function SectionNavigator({ items, className, testId }: SectionNavigatorProps) {
  const { styles, cx } = useStyles();

  return <Card className={cx(styles.card, className)} data-testid={testId}>
    {items.map((item) => {
      const rowContent = <>
        {item.icon ? <span className={styles.icon} aria-hidden="true">{item.icon}</span> : null}
        <span className={styles.copy}>
          <Typography.Text strong className={styles.title}>{item.title}</Typography.Text>
          {item.description ? <Typography.Text type="secondary" className={styles.description}>{item.description}</Typography.Text> : null}
          {item.content ? <div className={styles.content}>{item.content}</div> : null}
        </span>
        {item.trailing ? <span className={cx(styles.trailing, !item.icon && styles.trailingNoIcon)}>{item.trailing}</span> : null}
      </>;
      const rowClassName = cx(styles.row, !item.icon && styles.noIcon, item.onClick && styles.clickable, item.disabled && styles.disabled);

      return item.onClick ? <button key={item.key} type="button" className={rowClassName} onClick={item.onClick} disabled={item.disabled} data-testid={item.testId}>{rowContent}</button> : <div key={item.key} className={rowClassName} data-testid={item.testId}>{rowContent}</div>;
    })}
  </Card>;
}
