"use client";

import { Layout } from "antd";
import { Sidebar } from "@/layouts/app/components/sidebar/sidebar";
import { createStyles } from "antd-style";
import { ReactNode } from "react";
import { AuthGuard, ProfileCompletionGuard } from "@/domains/auth";
import { WorkspaceDataLoader } from "@/domains/workspace/components/workspace-data-loader";
import { usePathParams } from "@/registry";

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
  const pathContext = usePathParams();

  const orgName = pathContext.getParam("orgName");

  return (
    <AuthGuard>
      <ProfileCompletionGuard>
        <WorkspaceDataLoader organizationName={orgName}>
          <Layout className={cx(styles.layout)} hasSider>
            <Sidebar />
            <Layout>{children}</Layout>
          </Layout>
        </WorkspaceDataLoader>
      </ProfileCompletionGuard>
    </AuthGuard>
  );
};
