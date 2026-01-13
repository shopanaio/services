"use client";

import { Layout } from "antd";
import { createStyles } from "antd-style";
import { AuthGuard } from "@/domains/auth";

const useStyles = createStyles(({ token }) => ({
  layout: {
    minHeight: "100vh",
    background: token.colorBgLayout,
  },
  content: {
    width: "100%",
    maxWidth: 900,
    margin: "0 auto",
    padding: token.paddingLG,
  },
}));

/**
 * Layout for workspace pages (profile, organization settings, etc.)
 * No sidebar - standalone layout.
 */
export function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { styles } = useStyles();

  return (
    <AuthGuard>
      <Layout className={styles.layout}>
        <Layout.Content className={styles.content}>{children}</Layout.Content>
      </Layout>
    </AuthGuard>
  );
}
