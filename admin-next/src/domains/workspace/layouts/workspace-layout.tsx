"use client";

import { Layout } from "antd";
import { createStyles } from "antd-style";
import { AuthGuard, ProfileCompletionGuard } from "@/domains/auth";
import { FullLogo } from "@/ui-kit/logo/full-logo";
import { UserMenu } from "./components";

const useStyles = createStyles(({ token }) => ({
  layout: {
    minHeight: "100vh",
    background: token.colorBgLayout,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: `0 ${token.paddingLG}px`,
    background: "transparent",
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
 * No sidebar - standalone layout with user menu in header.
 */
export function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { styles } = useStyles();

  return (
    <AuthGuard>
      <ProfileCompletionGuard>
        <Layout className={styles.layout}>
          <Layout.Header className={styles.header}>
            <FullLogo size={20} />
            <UserMenu />
          </Layout.Header>
          <Layout.Content className={styles.content}>{children}</Layout.Content>
        </Layout>
      </ProfileCompletionGuard>
    </AuthGuard>
  );
}
