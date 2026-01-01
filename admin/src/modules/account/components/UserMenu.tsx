import { Flex } from '@components/utility/Flex';
import { UserAvatar } from '@modules/account/components/Avatar';
import { $session } from '@modules/auth/store/session';
import { useSelector } from '@reframework/qx';
import { MdLogout, MdOutlineAccountCircle } from 'react-icons/md';

import { Dropdown, Typography } from 'antd';
import { FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';
import { css } from '@emotion/react';
import { router } from '@modules/router/router';
import { routes } from '@modules/router/routes';
import { IMenuItemType } from '@src/types';

export const UserMenu = () => {
  const user = useSelector($session.currentUser);

  const items: IMenuItemType[] = user
    ? [
        {
          key: 'info',
          type: 'group',
          'data-testid': 'user-menu-info-group',
          label: (
            <Flex
              gap="2"
              justify="center"
              direction="column"
              css={css`
                cursor: default;
              `}
            >
              <Typography.Text strong>
                {user.firstName} {user.lastName}
              </Typography.Text>
              <Typography.Text
                style={{
                  marginTop: -10,
                  color: 'var(--color-gray-8)',
                  fontSize: 'var(--font-size-xs)',
                }}
              >
                {user.email}
              </Typography.Text>
            </Flex>
          ),
        },
        {
          type: 'divider',
        },
        {
          key: 'account',
          'data-testid': 'user-menu-account',
          onClick: () => {
            router.navigate(routes.account.link);
          },
          label: (
            <Flex gap="2" align="center">
              <MdOutlineAccountCircle />
              <Typography.Text>
                <FormattedMessage id={t('account::menu.manageAccount')} />
              </Typography.Text>
            </Flex>
          ),
        },
        {
          key: 'logout',
          'data-testid': 'user-menu-logout',
          onClick: () => {
            $session.clearSession({ isFetched: true });
          },
          label: (
            <Flex gap="2" align="center">
              <MdLogout />
              <Typography.Text>
                <FormattedMessage id={t('account::menu.logout')} />
              </Typography.Text>
            </Flex>
          ),
        },
      ]
    : [];

  return (
    <Dropdown
      arrow
      trigger={['click']}
      menu={{ items, style: { width: 220 } }}
      placement="bottomRight"
    >
      <UserAvatar user={user!} data-testid="user-menu" />
    </Dropdown>
  );
};
