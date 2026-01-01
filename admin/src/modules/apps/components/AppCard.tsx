import { Card, Typography, App as AntApp, Dropdown } from 'antd';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { IAvailableApp } from '@modules/apps/hooks/useApps';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';
import { useUninstallApp } from '@modules/apps/hooks/useUninstallApp';
import { useInstallApp } from '@modules/apps/hooks/useInstallApp';
import { IconButton } from '@components/IconButton';
import { MdCheckCircle } from 'react-icons/md';

interface Props {
  app: IAvailableApp;
}

export const AppCard = ({ app }: Props) => {
  const { message, modal } = AntApp.useApp();
  const { uninstall, loading } = useUninstallApp();
  const { install, loading: installing } = useInstallApp();
  const { formatMessage } = useIntl();

  const onInstall = async () => {
    await install(app.code);
    message.success(formatMessage({ id: t('apps.install.success') }));
  };

  const onUninstall = async () => {
    modal.confirm({
      icon: null,
      title: formatMessage({ id: t('apps.uninstall.title') }),
      content: formatMessage(
        { id: t('apps.uninstall.content') },
        { name: app.name },
      ),
      okText: formatMessage({ id: t('apps.uninstall.ok') }),
      cancelText: formatMessage({ id: t('common.cancel') }),
      onOk: async () => {
        await uninstall(app.code);
        message.success(formatMessage({ id: t('apps.uninstall.success') }));
      },
    });
  };

  return (
    <Card
      variant="outlined"
      styles={{
        body: {
          padding: 12,
        },
      }}
      css={css`
        border-color: ${app.installed
          ? 'var(--color-blue-6)'
          : 'var(--color-gray-3)'};
        height: 100%;
      `}
    >
      <Flex justify="space-between">
        <Flex gap="3" align="center">
          <div
            css={css`
              width: 40px;
              height: 40px;
              border-radius: 8px;
              overflow: hidden;
              background: var(--color-gray-2);
              display: flex;
              align-items: center;
              justify-content: center;
            `}
          >
            {app.logoUrl ? (
              <img src={app.logoUrl} width={40} height={40} alt="" />
            ) : (
              <Typography.Text type="secondary">{app.name[0]}</Typography.Text>
            )}
          </div>
          <Flex direction="column" grow="1">
            <Flex align="center" justify="space-between">
              <Flex align="center" gap="1">
                <Typography.Text strong>{app.name}</Typography.Text>
                {app.installed ? (
                  <MdCheckCircle
                    size={16}
                    color="var(--color-blue-6)"
                    aria-label="installed"
                  />
                ) : null}
              </Flex>
            </Flex>
            <Typography.Text type="secondary">{app.code}</Typography.Text>
          </Flex>
        </Flex>
        <Flex>
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  disabled: true,
                  key: 'settings',
                  label: formatMessage({ id: t('sidebar.menu_item.settings') }),
                },
                app.installed
                  ? {
                      key: 'uninstall',
                      label: formatMessage({ id: t('apps.uninstall') }),
                      onClick: onUninstall,
                    }
                  : {
                      key: 'install',
                      label: formatMessage({ id: t('apps.install') }),
                      onClick: onInstall,
                    },
              ],
            }}
          >
            <IconButton
              icon="menu"
              shape="default"
              loading={loading || installing}
              data-testid={`app-card-menu-${app.code}`}
            />
          </Dropdown>
        </Flex>
      </Flex>
    </Card>
  );
};
