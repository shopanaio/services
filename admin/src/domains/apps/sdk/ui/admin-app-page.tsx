"use client";

import { Flex, Typography } from "antd";
import { createStyles } from "antd-style";
import type { AdminAppPageLayoutProps } from "../contracts";

const useStyles = createStyles(({ token }) => ({
  root: {
    minHeight: "100%",
    padding: token.paddingLG,
    background: token.colorBgLayout,
  },
  header: {
    marginBottom: token.marginLG,
  },
  content: {
    minWidth: 0,
  },
}));

export function AdminAppPage({
  title,
  description,
  actions,
  children,
}: AdminAppPageLayoutProps) {
  const { styles } = useStyles();

  return (
    <main className={styles.root}>
      <Flex className={styles.header} justify="space-between" align="start">
        <div>
          <Typography.Title level={2}>{title}</Typography.Title>
          {description ? (
            <Typography.Text type="secondary">{description}</Typography.Text>
          ) : null}
        </div>
        {actions}
      </Flex>
      <section className={styles.content}>{children}</section>
    </main>
  );
}

