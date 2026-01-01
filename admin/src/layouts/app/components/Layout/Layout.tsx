import { useFetchStore } from '@modules/projects/hooks/useFetchStore';
import { $projects } from '@modules/projects/store/projects';
import { useSelector } from '@reframework/qx';
import { Drawers } from '@src/layouts/drawers/components/Drawers';
import { Layout } from 'antd';
import { Sidebar } from '@src/layouts/app/components/Sidebar/Sidebar';
import { css } from '@emotion/react';
import { Outlet } from 'react-router-dom';
import { DocumentTitle } from '@components/head/Title';
import { FavIcon } from '@components/head/Favicon';
import { useFetchLocales } from '@modules/locales/hooks/useFetchLocales';
import { AppLoader } from '@modules/app/components/Loader';

export const AppLayout = () => {
  useFetchStore();
  useFetchLocales();

  const currentProject = useSelector($projects.currentProject);

  if (!currentProject) {
    return <AppLoader />;
  }

  return (
    <Layout
      data-testid="project-layout"
      css={css`
        min-height: 100vh;
        background: var(--bg-gradient);

        & .ant-layout-sider-trigger {
          display: none;
        }
      `}
    >
      <DocumentTitle />
      <FavIcon />
      <Sidebar />
      <Layout>
        <Outlet />
      </Layout>
      <Drawers />
    </Layout>
  );
};
