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
    display: "block",
  },
  title: {
    alignItems: "center",
    display: "inline-flex",
    gap: token.paddingSM,
  },
}));

export function AdminAppPage({
  title,
  description,
  icon,
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
      title={
        <span className={styles.title}>
          {icon}
          {title}
        </span>
      }
    >
      <div className={styles.content}>
        {description ? (
          <Typography.Text
            className={styles.description}
            type="secondary"
          >
            {description}
          </Typography.Text>
        ) : null}
        {children}
      </div>
    </DataLayout>
  );
}
