import { Dropdown, Typography } from 'antd';
import { css } from '@emotion/react';

import { Flex } from '@components/utility/Flex';
import { $session } from '@modules/auth/store/session';
import { useSelector } from '@reframework/qx';
import { MdLogout, MdOutlineAccountCircle } from 'react-icons/md';
import { HiMiniChevronUpDown } from 'react-icons/hi2';

import { $projects } from '@modules/projects/store/projects';
import { router } from '@modules/router/router';
import { routes } from '@modules/router/routes';
import { IMenuItemType } from '@src/types';
import { UserAvatar } from '@modules/account/components/Avatar';
import { ShopIcon } from '@src/layouts/app/components/StoreMenu/shop-icon/ShopIcon';

interface Props {
  isCollapsed: boolean;
  storeId?: string;
}
export const StoreMenu = ({ isCollapsed }: Props) => {
  const user = useSelector($session.currentUser);
  const project = useSelector($projects.currentProject);

  if (!project || !user) {
    return null;
  }

  const items = user
    ? ([
        {
          key: 'current',
          type: 'group',
          label: (
            <Flex gap="2" align="center" data-testid="project-menu-current">
              <Typography.Text ellipsis>{project.name}</Typography.Text>
            </Flex>
          ),
        },
        {
          type: 'divider',
        },
        {
          key: 'info',
          title: null,
          type: 'group',
          label: (
            <Flex gap="2" align="center" data-testid="project-menu-user-info">
              <UserAvatar size={null} />
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
            </Flex>
          ),
        },
        {
          type: 'divider',
        },
        {
          key: 'stores',
          title: null,
          onClick: () => {
            router.navigate(routes.stores.link);
          },
          label: (
            <Flex gap="2" align="center" data-testid="project-menu-view-all">
              <ShopIcon color="var(--color-gray-10)" />
              <Typography.Text>All stores</Typography.Text>
            </Flex>
          ),
        },
        {
          key: 'account',
          title: null,
          onClick: () => {
            router.navigate(routes.account.link);
          },
          label: (
            <Flex
              gap="2"
              align="center"
              data-testid="project-menu-manage-account"
            >
              <MdOutlineAccountCircle />
              <Typography.Text>Manage account</Typography.Text>
            </Flex>
          ),
        },
        {
          key: 'logout',
          title: null,
          onClick: () => {
            $session.clearSession({ isFetched: true });
          },
          label: (
            <Flex gap="2" align="center" data-testid="project-menu-logout">
              <MdLogout />
              <Typography.Text>Logout</Typography.Text>
            </Flex>
          ),
        },
      ] as IMenuItemType[])
    : [];

  return (
    <Flex
      data-testid="project-menu"
      css={css`
        margin-top: 21px;
        margin-bottom: var(--x2);
        border-radius: var(--radius-base);
        /* border: 1px solid var(--color-border); */
        color: var(--color-text);
        transition:
          color 0.2s ease,
          width 0.2s ease;
        flex-wrap: nowrap;
        transition: 'width 0.2s ease';
        width: ${isCollapsed
          ? 'calc(100% - var(--x2))'
          : 'calc(100% - var(--x8))'};

        &:hover {
          cursor: pointer;
          color: var(--color-gray-8);
        }
      `}
    >
      <Dropdown
        trigger={['click']}
        css={css`
          .ant-dropdown-menu-inline-collapsed-tooltip {
            display: none !important;
          }
        `}
        menu={{
          items,
          mode: 'inline',
          inlineCollapsed: false,
          style: {
            minWidth: 220,
            maxWidth: 300,
            paddingTop: 'var(--x2)',
            paddingBottom: 'var(--x2)',
          },
          triggerSubMenuAction: 'click',
          openKeys: [],
          selectedKeys: [],
        }}
        // @ts-expect-error placement
        placement="rightTop"
      >
        <Flex
          gap="2"
          align="center"
          w="100%"
          css={css`
            padding: var(--x2);
            padding-left: var(--x3);
            overflow: hidden;
            border-radius: var(--radius-base);
            transition: background-color 0.2s ease;
            &:hover {
              background-color: var(--color-gray-3);
            }
          `}
        >
          <Flex
            direction="column"
            css={css`
              flex-grow: 1;
              overflow: hidden;
              max-height: var(--x12);
              opacity: ${isCollapsed ? 0 : 1};
              transition: all 0.2s ease;
            `}
          >
            <Typography.Text ellipsis strong>
              {project.name}
            </Typography.Text>
            <Typography.Text
              css={css`
                font-size: 12px;
              `}
              type="secondary"
              code
            >
              Beta
            </Typography.Text>
          </Flex>
          <HiMiniChevronUpDown
            size={18}
            css={css`
              margin-right: var(--x1);
            `}
          />
        </Flex>
      </Dropdown>
    </Flex>
  );
};
