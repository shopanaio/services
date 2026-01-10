"use client";

import { Layout } from "antd";
import { Sidebar } from "@/layouts/app/components/sidebar/sidebar";
import { createStyles } from "antd-style";
import { ReactNode } from "react";

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
    <Layout className={cx(styles.layout)} hasSider>
      <Sidebar />
      <Layout>{children}</Layout>
    </Layout>
  );
};
