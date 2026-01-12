"use client";

import { Layout } from "antd";
import { createStyles } from "antd-style";

const useStyles = createStyles(({ token }) => ({
  layout: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: token.colorBgLayout,
  },
  content: {
    width: "100%",
    maxWidth: 400,
  },
}));

/**
 * Layout for auth pages (sign-in, sign-up, etc.)
 * No sidebar, no auth guard - just a centered content area.
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { styles } = useStyles();

  return (
    <Layout className={styles.layout}>
      <div className={styles.content}>{children}</div>
    </Layout>
  );
}
