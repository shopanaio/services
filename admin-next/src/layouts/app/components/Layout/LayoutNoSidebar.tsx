"use client";

import { Layout } from 'antd';
import { createStyles } from 'antd-style';
import { ReactNode } from 'react';

const useStyles = createStyles({
  layout: {
    minHeight: '100vh',
  },
  inner: {
    background: 'var(--bg-gradient)',
  },
});

interface AppLayoutNoSidebarProps {
  children?: ReactNode;
}

export const AppLayoutNoSidebar = ({ children }: AppLayoutNoSidebarProps) => {
  const { styles } = useStyles();

  return (
    <Layout data-testid="project-layout-no-sidebar" className={styles.layout}>
      <Layout className={styles.inner}>{children}</Layout>
    </Layout>
  );
};
