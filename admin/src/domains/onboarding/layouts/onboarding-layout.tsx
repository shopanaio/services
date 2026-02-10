"use client";

import { Layout, Typography } from "antd";
import { createStyles } from "antd-style";
import { AuthGuard } from "@/domains/auth";
import { FullLogo } from "@/ui-kit/logo/full-logo";

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  layout: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: token.colorBgLayout,
  },
  header: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: `${token.paddingLG}px`,
    background: "transparent",
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: token.paddingLG,
  },
  container: {
    width: "100%",
    maxWidth: 480,
  },
  titleSection: {
    textAlign: "center" as const,
    marginBottom: token.marginXL,
  },
  title: {
    marginBottom: `${token.marginXS}px !important`,
  },
  subtitle: {
    color: token.colorTextSecondary,
  },
}));

/**
 * Layout for onboarding pages.
 * Minimal UI focused on completing the onboarding flow.
 * Uses AuthGuard to ensure user is authenticated but does NOT use ProfileCompletionGuard
 * (since this is where users complete their profile).
 */
export function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { styles } = useStyles();

  return (
    <AuthGuard>
      <Layout className={styles.layout}>
        <Layout.Header className={styles.header}>
          <FullLogo size={24} />
        </Layout.Header>
        <Layout.Content className={styles.content}>
          <div className={styles.container}>
            <div className={styles.titleSection}>
              <Title level={2} className={styles.title}>
                Complete Your Profile
              </Title>
              <Text className={styles.subtitle}>
                Please fill in the required information to continue
              </Text>
            </div>
            {children}
          </div>
        </Layout.Content>
      </Layout>
    </AuthGuard>
  );
}
