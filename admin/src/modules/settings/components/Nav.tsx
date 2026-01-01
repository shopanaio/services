import { ConfirmSaving } from '@components/forms/ConfirmSaving';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { StoreLabel } from '@modules/settings/components/StoreLabel';
import { SETTINGS_TABS } from '@modules/settings/defs';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { App, Typography } from 'antd';
import { routes } from '@modules/router/routes';
import { router } from '@modules/router/router';
import { useIntl, FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';

interface ISettingsNavProps {
  tab: any;
  isDirty?: boolean;
}

const tabs = [
  {
    id: SETTINGS_TABS.GENERAL,
    title: <FormattedMessage id={t('settings.nav.general')} />,
  },
  // { id: SETTINGS_TABS.PAYMENTS, title: <FormattedMessage id={t('settings.nav.payments')} /> },
  // { id: SETTINGS_TABS.SHIPPING, title: <FormattedMessage id={t('settings.nav.shipping')} /> },
  // { id: SETTINGS_TABS.FUNNEL, title: <FormattedMessage id={t('settings.nav.funnel')} /> },
  {
    id: SETTINGS_TABS.EMAILS,
    title: <FormattedMessage id={t('settings.nav.emails')} />,
  },
  {
    id: SETTINGS_TABS.APPS,
    title: <FormattedMessage id={t('settings.nav.apps')} />,
  },
  {
    id: SETTINGS_TABS.API_KEYS,
    title: <FormattedMessage id={t('settings.nav.apiKeys')} />,
  },
  {
    id: SETTINGS_TABS.TAGS,
    title: <FormattedMessage id={t('settings.nav.tags')} />,
  },
];

export const SettingsNav = ({ tab, isDirty }: ISettingsNavProps) => {
  const { modal } = App.useApp();
  const { formatMessage } = useIntl();
  const onClick = (id: string) => () => {
    const onOk = () => router.navigate(routes.settings.tabLink(id));
    if (isDirty) {
      return modal.confirm({
        icon: null,
        title: formatMessage({ id: t('layouts.drawer.unsavedChanges') }),
        content: formatMessage({
          id: t('layouts.drawer.unsavedChangesContent'),
        }),
        okText: formatMessage({ id: t('common.discard') }),
        cancelText: formatMessage({ id: t('common.cancel') }),
        onOk,
      });
    }

    onOk();
  };

  return (
    <>
      <StoreLabel key="label" />
      <DrawerPaper>
        <Box>
          {tabs.map((it, idx) => {
            return (
              <Flex
                key={idx}
                gap="4"
                py="1"
                px="4"
                h="40px"
                data-testid={`filters-nav-item-${idx}`}
                align="center"
                role="button"
                onClick={onClick(it.id)}
                css={css`
                  cursor: pointer;
                  border-radius: var(--radius-base);
                  margin-bottom: 1px;
                  &:hover span {
                    text-decoration: underline;
                  }
                `}
                style={{
                  ...(tab === it.id
                    ? { backgroundColor: 'var(--color-gray-3)' }
                    : {}),
                }}
              >
                <Typography.Text
                  ellipsis
                  style={{
                    ...(tab === it.id ? { color: 'var(--color-primary)' } : {}),
                  }}
                >
                  {it.title}
                </Typography.Text>
              </Flex>
            );
          })}
        </Box>
      </DrawerPaper>
    </>
  );
};
