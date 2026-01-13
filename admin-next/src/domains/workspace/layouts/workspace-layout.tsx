"use client";

import { Layout, Button, Flex, Typography } from "antd";
import { createStyles } from "antd-style";
import { ArrowLeftOutlined } from "@ant-design/icons";
import Link from "next/link";
import { AuthGuard } from "@/domains/auth";

const useStyles = createStyles(({ token }) => ({
  layout: {
    minHeight: "100vh",
    background: token.colorBgLayout,
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: `0 ${token.paddingLG}px`,
    background: token.colorBgContainer,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    height: 56,
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
 * No sidebar - standalone layout with back navigation to main app.
 */
export function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { styles } = useStyles();

  return (
    <AuthGuard>
      <Layout className={styles.layout}>
        <header className={styles.header}>
          <Flex align="center" gap="middle">
            <Link href="/">
              <Button type="text" icon={<ArrowLeftOutlined />}>
                Back to store
              </Button>
            </Link>
            <Typography.Text type="secondary">|</Typography.Text>
            <Typography.Text strong>Account Settings</Typography.Text>
          </Flex>
        </header>
        <Layout.Content className={styles.content}>{children}</Layout.Content>
      </Layout>
    </AuthGuard>
  );
}
