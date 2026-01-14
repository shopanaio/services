"use client";

import { Avatar, Dropdown, Typography, Flex } from "antd";
import { createStyles } from "antd-style";
import { MdLogout, MdOutlineAccountCircle, MdBusiness } from "react-icons/md";
import type { MenuProps } from "antd";
import { useRouter } from "next/navigation";

import { useSession, useSignOut } from "@/domains/auth";

const useStyles = createStyles(({ css, token }) => ({
  trigger: css`
    cursor: pointer;
    border-radius: 50%;
    transition: box-shadow 0.2s ease;

    &:hover {
      box-shadow: 0 0 0 2px ${token.colorPrimaryBg};
    }
  `,
  dropdownContent: css`
    min-width: 200px;
  `,
  userEmail: css`
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
  `,
}));

export function UserMenu() {
  const { styles } = useStyles();
  const router = useRouter();
  const { user } = useSession();
  const { signOut } = useSignOut();

  const userName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : user?.email ?? "User";
  const userEmail = user?.email ?? "";
  const initials =
    user?.firstName?.[0]?.toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    "U";

  const items: MenuProps["items"] = [
    {
      key: "user-info",
      type: "group",
      label: (
        <Flex vertical>
          <Typography.Text strong>{userName}</Typography.Text>
          <Typography.Text className={styles.userEmail}>
            {userEmail}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      type: "divider",
      key: "divider-1",
    },
    {
      key: "workspace",
      onClick: () => router.push("/workspace"),
      label: (
        <Flex gap="small" align="center">
          <MdBusiness />
          <Typography.Text>Workspace</Typography.Text>
        </Flex>
      ),
    },
    {
      key: "account",
      onClick: () => router.push("/profile"),
      label: (
        <Flex gap="small" align="center">
          <MdOutlineAccountCircle />
          <Typography.Text>Account</Typography.Text>
        </Flex>
      ),
    },
    {
      type: "divider",
      key: "divider-2",
    },
    {
      key: "logout",
      onClick: () => signOut(),
      label: (
        <Flex gap="small" align="center">
          <MdLogout />
          <Typography.Text>Logout</Typography.Text>
        </Flex>
      ),
    },
  ];

  return (
    <Dropdown
      trigger={["click"]}
      menu={{ items, className: styles.dropdownContent }}
      placement="bottomRight"
    >
      <Avatar size={36} className={styles.trigger}>
        {initials}
      </Avatar>
    </Dropdown>
  );
}
