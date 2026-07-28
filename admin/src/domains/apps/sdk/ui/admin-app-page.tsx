"use client";

import { Typography } from "antd";
import { createStyles } from "antd-style";
import { DataLayout } from "@/layouts/data";
import type { AdminAppPageLayoutProps } from "../contracts";

const useStyles = createStyles(({ token }) => ({
  content: {
    display: "flex",
    flexDirection: "column",
    gap: token.padding,
    paddingBottom: token.padding,
  },
  description: {
    margin: 0,
  },
}));

export function AdminAppPage({
  title,
  description,
  actions,
  onBack,
  children,
}: AdminAppPageLayoutProps) {
  const { styles } = useStyles();

  return (
    <DataLayout
      actions={actions}
      name="admin-app"
      onBack={onBack}
      title={title}
    >
      <div className={styles.content}>
        {description ? (
          <Typography.Paragraph
            className={styles.description}
            type="secondary"
          >
            {description}
          </Typography.Paragraph>
        ) : null}
        {children}
      </div>
    </DataLayout>
  );
}
