'use client';

import { Dropdown, Typography, Flex } from 'antd';
import { createStyles } from 'antd-style';
import { MdLogout, MdOutlineAccountCircle, MdBusiness } from 'react-icons/md';
import { HiMiniChevronUpDown } from 'react-icons/hi2';
import { MdLightMode, MdDarkMode, MdBrightness4, MdCheck } from 'react-icons/md';
import type { MenuProps } from 'antd';
import { useRouter } from 'next/navigation';

import { ShopIcon } from '@/layouts/app/components/store-menu/shop-icon/shop-icon';
import { useThemeContext } from '@/ui-kit/theme';

const useStyles = createStyles(({ css, token }, { isCollapsed }: { isCollapsed: boolean }) => ({
  container: css`
    margin-top: 21px;
    margin-bottom: ${token.paddingXS}px;
    border-radius: ${token.borderRadius}px;
    color: ${token.colorText};
    transition:
      color 0.2s ease,
      width 0.2s ease;
    flex-wrap: nowrap;
    width: ${isCollapsed ? `calc(100% - ${token.paddingXS}px)` : `calc(100% - ${token.padding}px)`};

    &:hover {
      cursor: pointer;
      color: ${token.colorTextSecondary};
    }
  `,
  dropdownContent: css`
    min-width: 220px;
    max-width: 300px;
    padding-top: ${token.paddingXS}px;
    padding-bottom: ${token.paddingXS}px;
  `,
  triggerWrapper: css`
    padding: ${token.paddingXS}px;
    padding-left: ${token.paddingSM}px;
    overflow: hidden;
    border-radius: ${token.borderRadius}px;
    transition: background-color 0.2s ease;
    &:hover {
      background-color: ${token.colorFillTertiary};
    }
  `,
  storeInfo: css`
    flex-grow: 1;
    overflow: hidden;
    max-height: 48px;
    opacity: ${isCollapsed ? 0 : 1};
    transition: all 0.2s ease;
  `,
  betaText: css`
    font-size: 12px;
  `,
  chevron: css`
    margin-right: ${token.paddingXXS}px;
  `,
  userInfoWrapper: css`
    cursor: default;
  `,
  userEmail: css`
    margin-top: -10px;
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
  `,
}));

interface Props {
  isCollapsed: boolean;
  storeName?: string;
  userName?: string;
  userEmail?: string;
  onAllStoresClick?: () => void;
  onLogoutClick?: () => void;
}

export const StoreMenu = ({
  isCollapsed,
  storeName = 'My Store',
  userName = 'John Doe',
  userEmail = 'john@example.com',
  onAllStoresClick,
  onLogoutClick,
}: Props) => {
  const { styles } = useStyles({ isCollapsed });
  const { themePreference, setThemePreference } = useThemeContext();
  const router = useRouter();

  const themeOptions = [
    { key: 'light', label: 'Light', icon: <MdLightMode /> },
    { key: 'dark', label: 'Dark', icon: <MdDarkMode /> },
    { key: 'auto', label: 'Auto', icon: <MdBrightness4 /> },
  ] as const;

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
      key: 'theme',
      label: (
        <Flex gap="small" align="center" data-testid="project-menu-theme">
          {themeOptions.find((t) => t.key === themePreference)?.icon}
          <Typography.Text>Theme</Typography.Text>
        </Flex>
      ),
      children: themeOptions.map((option) => ({
        key: `theme-${option.key}`,
        onClick: () => setThemePreference(option.key),
        label: (
          <Flex gap="small" align="center" justify="space-between" style={{ minWidth: 100 }}>
            <Flex gap="small" align="center">
              {option.icon}
              <Typography.Text>
                {option.label}
              </Typography.Text>
            </Flex>
            {themePreference === option.key && <MdCheck />}
          </Flex>
        ),
      })),
    },
    {
      type: 'divider' as const,
      key: 'divider-3',
    },
    {
      key: 'profile',
      onClick: () => router.push('/workspace/profile'),
      label: (
        <Flex gap="small" align="center" data-testid="project-menu-profile">
          <MdOutlineAccountCircle />
          <Typography.Text>Profile</Typography.Text>
        </Flex>
      ),
    },
    {
      key: 'workspace',
      onClick: () => router.push('/workspace/organization'),
      label: (
        <Flex gap="small" align="center" data-testid="project-menu-workspace">
          <MdBusiness />
          <Typography.Text>Workspace</Typography.Text>
        </Flex>
      ),
    },
    {
      type: 'divider' as const,
      key: 'divider-4',
    },
    {
      key: 'stores',
      onClick: onAllStoresClick,
      label: (
        <Flex gap="small" align="center" data-testid="project-menu-view-all">
          <ShopIcon color="var(--ant-color-text)" />
          <Typography.Text>All stores</Typography.Text>
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
          selectedKeys: [`theme-${themePreference}`],
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
