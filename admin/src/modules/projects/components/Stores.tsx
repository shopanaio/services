import { StoresLayout } from '@modules/projects/components/Layout';
import { Button, Tabs } from 'antd';
import { useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Flex } from '@components/utility/Flex';
import { useSelector } from '@reframework/qx';
import { $session } from '@modules/auth/store/session';
import { useProjects } from '@modules/projects/hooks/useProjects';
import {
  NoProjects,
  UserNotVerified,
} from '@modules/projects/components/EmptyState';
import { ProjectItem } from '@modules/projects/components/ProjectItem';
import { IProject } from '@src/entity/Project/Project';
import { ProjectsBadge } from '@modules/projects/components/Badge';
import { routes } from '@modules/router/routes';
import { router } from '@modules/router/router';
import { useInitialDelay } from '@src/hooks/useInitialDelay';
import { ProjectStatus } from '@src/graphql';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

const Stores = () => {
  const { formatMessage } = useIntl();
  const { loading, data: projects } = useProjects();
  const user = useSelector($session.currentUser);
  const isVerified = !!user?.isVerified;
  const isUserReady = !!user?.isReady;

  const uiReady = useInitialDelay();

  const [activeTab, setActiveTab] = useState('active');

  const renderProjects = (projects: IProject[]) => {
    if (!isVerified) {
      return <UserNotVerified />;
    }

    if (!projects.length) {
      return <NoProjects />;
    }

    return (
      <Flex direction="column" gap="2">
        {projects.map((it) => (
          <ProjectItem
            key={it.slug}
            name={it.name}
            active={it.status === ProjectStatus.Active}
            slug={it.slug}
            color={it.color}
          />
        ))}
      </Flex>
    );
  };

  const tabs = [
    {
      key: 'active',
      label: (
        <ProjectsBadge
          data-testid="active-projects-badge"
          active={activeTab === 'active'}
          count={projects.length}
        >
          {formatMessage({ id: t('projects.tabs.active') })}
        </ProjectsBadge>
      ),
      children: renderProjects(projects),
    },
  ];

  return (
    <StoresLayout loading={loading || !uiReady || !isUserReady}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabs}
        tabBarExtraContent={{
          right: (
            <Button
              data-testid="create-project-button"
              disabled={!isVerified}
              icon={<PlusOutlined />}
              type="primary"
              onClick={() => {
                router.navigate(routes.createProject.link);
              }}
            >
              {formatMessage({ id: t('projects.create') })}
            </Button>
          ),
        }}
      />
    </StoresLayout>
  );
};

// react.lazy
// eslint-disable-next-line import/no-default-export
export default Stores;
