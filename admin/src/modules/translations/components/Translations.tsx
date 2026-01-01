import { Paper } from '@components/paper/Paper';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { useLocales } from '@modules/locales/hooks/useLocales';
import { $projects } from '@modules/projects/store/projects';
import { TranslationsNav } from '@modules/translations/components/Nav';
import { useSelector } from '@reframework/qx';
import { EntityType } from '@src/graphql';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { DrawerTypes } from '@src/layouts/drawers/types';
import { DataLayout } from '@src/layouts/table/components/DataLayout';
import { LayoutSkeleton } from '@src/layouts/table/components/Skeleton';
import { Table, Typography } from 'antd';
import { partition } from 'lodash';
import { MdChevronRight } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

const Translations = () => {
  const { formatMessage } = useIntl();
  const { locale: defaultCode } = useSelector($projects.currentProject) || {};
  const { locales } = useLocales();

  const [[defaultLocale], extraLocales] = partition(
    locales,
    (locale) => locale.code === defaultCode,
  );

  if (!locales.length) {
    return <LayoutSkeleton filters={false} />;
  }

  return (
    <DataLayout
      name="translations"
      headerProps={{
        title: formatMessage({ id: t('translations.title') }),
      }}
      leftColumn={[
        <Paper
          css={css`
            padding: var(--x2) 0;
          `}
        >
          <Table
            css={css`
              & td {
                cursor: pointer;
              }
            `}
            showSorterTooltip={false}
            sortDirections={['ascend', 'descend']}
            showHeader={false}
            onRow={({ entityType }) => ({
              onClick: () => {
                $drawers.addDrawer({
                  type: DrawerTypes.BROWSE_TRANSLATION,
                  entityType,
                });
              },
            })}
            pagination={false}
            columns={[
              {
                title: formatMessage({ id: t('translations.label') }),
                dataIndex: 'label',
                key: 'label',
                render: (text) => {
                  return (
                    <Box pl="4">
                      <Flex align="center" minH="32px">
                        <Typography.Text>{text}</Typography.Text>
                      </Flex>
                    </Box>
                  );
                },
              },
              {
                title: formatMessage({ id: t('translations.actions') }),
                key: 'actions',
                width: 40,
                render: () => {
                  return (
                    <MdChevronRight size={16} color="var(--color-gray-7)" />
                  );
                },
              },
            ]}
            dataSource={[
              {
                label: formatMessage({ id: t('translations.products') }),
                entityType: EntityType.ProdContainer,
              },
              {
                label: formatMessage({ id: t('translations.categories') }),
                entityType: EntityType.Category,
              },
              {
                label: formatMessage({ id: t('translations.pages') }),
                entityType: EntityType.Page,
              },
              {
                label: formatMessage({ id: t('translations.menus') }),
                entityType: EntityType.Menu,
              },
              {
                label: formatMessage({ id: t('translations.tags') }),
                entityType: EntityType.Tag,
              },
            ]}
          />
        </Paper>,
      ]}
      rightColumn={[
        <TranslationsNav
          locales={[defaultLocale, ...extraLocales]}
          manageButton
        />,
      ]}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export default Translations;
