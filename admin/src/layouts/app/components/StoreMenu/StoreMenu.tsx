import { Dropdown, Typography, Flex } from 'antd';
import { createStyles } from 'antd-style';
import { MdLogout, MdOutlineAccountCircle } from 'react-icons/md';
import { HiMiniChevronUpDown } from 'react-icons/hi2';
import type { MenuProps } from 'antd';

import { ShopIcon } from '@/layouts/app/components/StoreMenu/shop-icon/ShopIcon';

const useStyles = createStyles(({ css }, { isCollapsed }: { isCollapsed: boolean }) => ({
  container: css`
    margin-top: 21px;
    margin-bottom: var(--x2);
    border-radius: var(--radius-base);
    color: var(--color-text);
    transition:
      color 0.2s ease,
      width 0.2s ease;
    flex-wrap: nowrap;
    width: ${isCollapsed ? 'calc(100% - var(--x2))' : 'calc(100% - var(--x4))'};

    &:hover {
      cursor: pointer;
      color: var(--color-gray-8);
    }
  `,
  dropdownContent: css`
    min-width: 220px;
    max-width: 300px;
    padding-top: var(--x2);
    padding-bottom: var(--x2);
  `,
  triggerWrapper: css`
    padding: var(--x2);
    padding-left: var(--x3);
    overflow: hidden;
    border-radius: var(--radius-base);
    transition: background-color 0.2s ease;
    &:hover {
      background-color: var(--color-gray-3);
    }
  `,
  storeInfo: css`
    flex-grow: 1;
    overflow: hidden;
    max-height: var(--x12);
    opacity: ${isCollapsed ? 0 : 1};
    transition: all 0.2s ease;
  `,
  betaText: css`
    font-size: 12px;
  `,
  chevron: css`
    margin-right: var(--x1);
  `,
  userInfoWrapper: css`
    cursor: default;
  `,
  userEmail: css`
    margin-top: -10px;
    color: var(--color-gray-8);
    font-size: var(--font-size-xs);
  `,
}));

interface Props {
  isCollapsed: boolean;
  storeName?: string;
  userName?: string;
  userEmail?: string;
  onAllStoresClick?: () => void;
  onAccountClick?: () => void;
  onLogoutClick?: () => void;
}

export const StoreMenu = ({
  isCollapsed,
  storeName = 'My Store',
  userName = 'John Doe',
  userEmail = 'john@example.com',
  onAllStoresClick,
  onAccountClick,
  onLogoutClick,
}: Props) => {
  const { styles } = useStyles({ isCollapsed });

  const items: MenuProps['items'] = [
    {
      key: 'current',
      type: 'group' as const,
      label: (
        <Flex gap="small" align="center" data-testid="project-menu-current">
          <Typography.Text ellipsis>{storeName}</Typography.Text>
        </Flex>
      ),
    },
    {
      type: 'divider' as const,
      key: 'divider-1',
    },
    {
      key: 'info',
      type: 'group' as const,
      label: (
        <Flex gap="small" align="center" data-testid="project-menu-user-info">
          <Flex
            gap="small"
            justify="center"
            vertical
            className={styles.userInfoWrapper}
          >
            <Typography.Text strong>{userName}</Typography.Text>
            <Typography.Text className={styles.userEmail}>
              {userEmail}
            </Typography.Text>
          </Flex>
        </Flex>
      ),
    },
    {
      type: 'divider' as const,
      key: 'divider-2',
    },
    {
      key: 'stores',
      onClick: onAllStoresClick,
      label: (
        <Flex gap="small" align="center" data-testid="project-menu-view-all">
          <ShopIcon color="var(--color-gray-10)" />
          <Typography.Text>All stores</Typography.Text>
        </Flex>
      ),
    },
    {
      key: 'account',
      onClick: onAccountClick,
      label: (
        <Flex
          gap="small"
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
      onClick: onLogoutClick,
      label: (
        <Flex gap="small" align="center" data-testid="project-menu-logout">
          <MdLogout />
          <Typography.Text>Logout</Typography.Text>
        </Flex>
      ),
    },
  ];

  return (
    <Flex
      data-testid="project-menu"
      className={styles.container}
    >
      <Dropdown
        trigger={['click']}
        menu={{
          items,
          className: 'store-menu-dropdown',
        }}
        placement="bottomRight"
      >
        <Flex
          gap="small"
          align="center"
          style={{ width: '100%' }}
          className={styles.triggerWrapper}
        >
          <Flex
            vertical
            className={styles.storeInfo}
          >
            <Typography.Text ellipsis strong>
              {storeName}
            </Typography.Text>
            <Typography.Text
              className={styles.betaText}
              type="secondary"
              code
            >
              Beta
            </Typography.Text>
          </Flex>
          <HiMiniChevronUpDown
            size={18}
            className={styles.chevron}
          />
        </Flex>
      </Dropdown>
    </Flex>
  );
};
