import { Tabs, Skeleton } from 'antd';
import SkeletonButton from 'antd/es/skeleton/Button';
import { css } from '@emotion/react';
import { Box } from '@components/utility/Box';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const SkeletonTabs = () => {
  const { formatMessage } = useIntl();
  const tabs = [
    {
      key: 'active',
      disabled: true,
      label: formatMessage({ id: t('projects.badge.active') }),
    },
    {
      key: 'inactive',
      disabled: true,
      label: 'Inactive',
    },
  ];

  return (
    <>
      <Tabs
        animated={false}
        activeKey=""
        items={tabs}
        tabBarExtraContent={{
          right: (
            <Box w="120px">
              <SkeletonButton
                block
                active
                css={css`
                  width: 200px;
                `}
              />
            </Box>
          ),
        }}
      />
      <Skeleton active />
    </>
  );
};
