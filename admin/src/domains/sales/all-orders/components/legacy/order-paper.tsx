"use client";
import type { HTMLAttributes, ReactNode } from "react";
import { Badge, Flex, Typography } from "antd";
import { createStyles } from "antd-style";

const useStyles = createStyles(({ token }) => ({
  paper: {
    boxSizing: "border-box",
    borderRadius: token.borderRadius,
    backgroundColor: token.colorBgContainer,
    boxShadow: token.boxShadowTertiary,
    width: "100%",
    padding: token.padding,
    minHeight: 50,
  },
  header: {
    height: 32,
    marginBottom: token.margin,
  },
  title: { fontSize: 15, paddingRight: token.paddingSM },
}));

export function OrderPaper({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { styles, cx } = useStyles();
  return <div className={cx(styles.paper, className)} {...props}>{children}</div>;
}

export function OrderPaperHeader({ title, extra, actions, badgeCount, name = "order", showZero = true }: { title: ReactNode; extra?: ReactNode; actions?: ReactNode; badgeCount?: number; name?: string; showZero?: boolean }) {
  const { styles } = useStyles();
  const renderedTitle = typeof title === "string"
    ? <Badge count={badgeCount} showZero={showZero} color="#1677ff" overflowCount={9999}><Typography.Text strong className={styles.title}>{title}</Typography.Text></Badge>
    : title;
  return <Flex className={styles.header} align="center" justify="space-between" data-testid={`${name}-header`}><div style={{ width: "100%" }}>{renderedTitle}</div>{extra ?? actions}</Flex>;
}
