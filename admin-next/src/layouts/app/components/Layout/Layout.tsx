"use client";

import { Layout } from "antd";
import { Sidebar } from "@/layouts/app/components/Sidebar/Sidebar";
import { createStyles } from "antd-style";
import { ReactNode } from "react";

const useStyles = createStyles({
  layout: {
    minHeight: "100vh",
    background: "var(--bg-gradient)",
    "& .ant-layout-sider-trigger": {
      display: "none",
    },

    "& .ant-menu-submenu": {
      "--ant-menu-item-margin-block": "0px",
    },
  },
});

interface AppLayoutProps {
  children?: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { styles } = useStyles();

  return (
    <Layout className={styles.layout} hasSider>
      <Sidebar />
      <Layout>{children}</Layout>
    </Layout>
  );
};
