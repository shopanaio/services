"use client";

import { Dropdown, Typography, Flex } from "antd";
import { createStyles } from "antd-style";
import { MdLogout, MdOutlineAccountCircle, MdBusiness } from "react-icons/md";
import { HiMiniChevronUpDown } from "react-icons/hi2";
import {
  MdLightMode,
  MdDarkMode,
  MdBrightness4,
  MdCheck,
} from "react-icons/md";
import type { MenuProps } from "antd";
import { useRouter } from "next/navigation";

import { ShopIcon } from "@/layouts/app/components/store-menu/shop-icon/shop-icon";
import { useThemeContext } from "@/ui-kit/theme";
import { useWorkspaceOptional } from "@/domains/workspace/context/workspace-context";
import { useSession, useSignOut } from "@/domains/auth";

const useStyles = createStyles(
  ({ css, token }, { isCollapsed }: { isCollapsed: boolean }) => ({
    container: css`
      margin-top: 21px;
      margin-bottom: ${token.paddingXS}px;
      border-radius: ${token.borderRadius}px;
      color: ${token.colorText};
      transition: color 0.2s ease, width 0.2s ease;
      flex-wrap: nowrap;
      width: ${isCollapsed
        ? `calc(100% - ${token.paddingXS}px)`
        : `calc(100% - ${token.padding}px)`};

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
  })
);

interface Props {
  isCollapsed: boolean;
}

export const StoreMenu = ({ isCollapsed }: Props) => {
  const { styles } = useStyles({ isCollapsed });
  const { themePreference, setThemePreference } = useThemeContext();
  const router = useRouter();
  const workspace = useWorkspaceOptional();
  const { user } = useSession();
  const { signOut } = useSignOut();

  // Get display values from context or fallback
  const displayName =
    workspace?.store?.displayName ??
    workspace?.organization?.displayName ??
    "Select Store";
  // Build user display name from firstName/lastName or fallback to email
  const userName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : user?.email ?? "User";
  const userEmail = user?.email ?? "";

  const themeOptions = [
    { key: "light", label: "Light", icon: <MdLightMode /> },
    { key: "dark", label: "Dark", icon: <MdDarkMode /> },
    { key: "auto", label: "Auto", icon: <MdBrightness4 /> },
  ] as const;

  const items: MenuProps["items"] = [
    {
      key: "current",
      type: "group" as const,
      label: (
        <Flex gap="small" align="center" data-testid="project-menu-current">
          <Typography.Text ellipsis>{displayName}</Typography.Text>
        </Flex>
      ),
    },
    {
      type: "divider" as const,
      key: "divider-1",
    },
    {
      key: "info",
      type: "group" as const,
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
      type: "divider" as const,
      key: "divider-2",
    },
    {
      key: "theme",
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
          <Flex
            gap="small"
            align="center"
            justify="space-between"
            style={{ minWidth: 100 }}
          >
            <Flex gap="small" align="center">
              {option.icon}
              <Typography.Text>{option.label}</Typography.Text>
            </Flex>
            {themePreference === option.key && <MdCheck />}
          </Flex>
        ),
      })),
    },
    {
      type: "divider" as const,
      key: "divider-3",
    },
    {
      key: "organization",
      onClick: () => router.push("/workspace"),
      label: (
        <Flex
          gap="small"
          align="center"
          data-testid="project-menu-organization"
        >
          <MdBusiness />
          <Typography.Text>Workspace</Typography.Text>
        </Flex>
      ),
    },
    {
      key: "account",
      onClick: () => router.push("/profile"),
      label: (
        <Flex gap="small" align="center" data-testid="project-menu-account">
          <MdOutlineAccountCircle />
          <Typography.Text>Account</Typography.Text>
        </Flex>
      ),
    },
    {
      type: "divider" as const,
      key: "divider-4",
    },

    {
      key: "logout",
      onClick: () => signOut(),
      label: (
        <Flex gap="small" align="center" data-testid="project-menu-logout">
          <MdLogout />
          <Typography.Text>Logout</Typography.Text>
        </Flex>
      ),
    },
  ];

  return (
    <Flex data-testid="project-menu" className={styles.container}>
      <Dropdown
        trigger={["click"]}
        menu={{
          items,
          selectedKeys: [`theme-${themePreference}`],
          className: "store-menu-dropdown",
        }}
        placement="bottomRight"
      >
        <Flex
          gap="small"
          align="center"
          style={{ width: "100%" }}
          className={styles.triggerWrapper}
        >
          <Flex vertical className={styles.storeInfo}>
            <Typography.Text ellipsis strong>
              {displayName}
            </Typography.Text>
            <Typography.Text className={styles.betaText} type="secondary" code>
              Beta
            </Typography.Text>
          </Flex>
          <HiMiniChevronUpDown size={18} className={styles.chevron} />
        </Flex>
      </Dropdown>
    </Flex>
  );
};
