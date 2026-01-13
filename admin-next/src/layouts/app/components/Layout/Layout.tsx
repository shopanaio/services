"use client";

import { Layout } from "antd";
import { Sidebar } from "@/layouts/app/components/sidebar/sidebar";
import { createStyles } from "antd-style";
import { ReactNode } from "react";
import { AuthGuard } from "@/domains/auth";
import { WorkspaceProvider } from "@/domains/workspace/context/workspace-context";
import { usePathParamsOptional } from "@/registry";

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
  const pathContext = usePathParamsOptional();

  // Extract org and store names from path params
  const orgName = pathContext?.getParam("orgName");
  const storeName = pathContext?.getParam("storeName");

  return (
    <AuthGuard>
      <WorkspaceProvider
        initialOrganizationName={orgName}
        initialStoreName={storeName}
      >
        <Layout className={cx(styles.layout)} hasSider>
          <Sidebar />
          <Layout>{children}</Layout>
        </Layout>
      </WorkspaceProvider>
    </AuthGuard>
  );
};
