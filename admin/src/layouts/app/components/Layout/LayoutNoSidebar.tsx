import { useFetchStore } from '@modules/projects/hooks/useFetchStore';
import { $projects } from '@modules/projects/store/projects';
import { useSelector } from '@reframework/qx';
import { Spin, Layout } from 'antd';
import { css } from '@emotion/react';
import { Outlet } from 'react-router-dom';
import { useFetchLocales } from '@modules/locales/hooks/useFetchLocales';

export const AppLayoutNoSidebar = () => {
  useFetchStore();
  useFetchLocales();

  const currentProject = useSelector($projects.currentProject);

  if (!currentProject) {
    // TODO: Spinner should be in the center of the screen
    return <Spin />;
  }

  return (
    <Layout
      data-testid="project-layout-no-sidebar"
      css={css`
        min-height: 100vh;
      `}
    >
      <Layout
        style={{
          background: 'var(--bg-gradient)',
        }}
      >
        <Outlet />
      </Layout>
    </Layout>
  );
};
