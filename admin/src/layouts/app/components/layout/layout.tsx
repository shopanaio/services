"use client";

import { Layout } from "antd";
import { Sidebar } from "@/layouts/app/components/sidebar/sidebar";
import { createStyles } from "antd-style";
import { ReactNode } from "react";
import { AuthGuard, ProfileCompletionGuard } from "@/domains/auth";
import { StoreProvider } from "./store-provider";

const useStyles = createStyles(({ token }) => ({
  layout: {
    minHeight: "100vh",
    background: token.colorBgContainer,
    "& .ant-layout-sider-trigger": {
      display: "none",
    },

    "& .ant-menu-submenu": {
      "--ant-menu-item-margin-block": "0px",
    },
  },
}));

interface AppLayoutProps {
  children?: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { styles, cx } = useStyles();

  return (
    <AuthGuard>
      <ProfileCompletionGuard>
        <StoreProvider>
          <Layout className={cx(styles.layout)} hasSider>
            <Sidebar />
            <Layout>{children}</Layout>
          </Layout>
        </StoreProvider>
      </ProfileCompletionGuard>
    </AuthGuard>
  );
};
