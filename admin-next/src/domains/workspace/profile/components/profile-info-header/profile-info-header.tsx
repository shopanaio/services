"use client";

import { useState } from "react";
import {
  Button,
  Tag,
  Typography,
  Dropdown,
  Tooltip,
  Flex,
  Avatar,
} from "antd";
import {
  CheckOutlined,
  MoreOutlined,
  LinkOutlined,
  UserOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { createStyles } from "antd-style";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { CopyableChip } from "@/ui-kit/copyable-chip";
import type { ApiUser } from "@/graphql/types";

// ============================================================================
// Types
// ============================================================================

export interface IProfileInfoHeaderProps {
  user: ApiUser;
  organizationName?: string;
  onEdit?: () => void;
}

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  statusTag: {
    margin: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontWeight: 500,
  },
  metaText: {
    fontSize: token.fontSizeSM,
  },
  actionButton: {
    padding: 0,
  },
  avatar: {
    backgroundColor: token.colorPrimary,
    cursor: "pointer",
    transition: "opacity 0.2s",
    flexShrink: 0,
    "&:hover": {
      opacity: 0.8,
    },
  },
  titleSection: {
    flex: 1,
    minWidth: 0,
  },
  profileTitle: {
    marginBottom: 0,
  },
  subtitle: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
}));

// ============================================================================
// Helpers
// ============================================================================

function getDisplayName(user: ApiUser): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.firstName) return user.firstName;
  if (user.lastName) return user.lastName;
  return String(user.email).split("@")[0];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ============================================================================
// Component
// ============================================================================

export const ProfileInfoHeader = ({
  user,
  organizationName,
  onEdit,
}: IProfileInfoHeaderProps) => {
  const { styles } = useStyles();
  const [linkCopied, setLinkCopied] = useState(false);

  const displayName = getDisplayName(user);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  };

  const statusTitle = (
    <Flex align="center" gap={8}>
      {user.emailVerified ? (
        <Tooltip title="Email verified">
          <Tag
            color="success"
            icon={<CheckCircleOutlined />}
            className={styles.statusTag}
          >
            Verified
          </Tag>
        </Tooltip>
      ) : (
        <Tooltip title="Email not verified">
          <Tag color="warning" className={styles.statusTag}>
            Unverified
          </Tag>
        </Tooltip>
      )}
      {user.isAdmin && (
        <Tag color="blue" className={styles.statusTag}>
          Admin
        </Tag>
      )}
    </Flex>
  );

  const topBarActions = (
    <Flex align="center" gap={12}>
      <Flex align="center" gap={8}>
        <Button
          variant="text"
          color="default"
          size="small"
          icon={linkCopied ? <CheckOutlined /> : <LinkOutlined />}
          onClick={handleCopyLink}
          className={styles.actionButton}
        />
      </Flex>
      <Dropdown
        menu={{
          items: [{ key: "edit", label: "Edit profile", onClick: onEdit }],
        }}
        trigger={["click"]}
      >
        <Button size="small" icon={<MoreOutlined />} />
      </Dropdown>
    </Flex>
  );

  return (
    <Paper>
      <PaperHeader title={statusTitle} actions={topBarActions} />

      <Flex gap={16} align="flex-start">
        <Avatar
          size={64}
          src={user.avatar}
          icon={<UserOutlined />}
          className={styles.avatar}
          onClick={onEdit}
        >
          {getInitials(displayName)}
        </Avatar>

        <Flex vertical gap={4} className={styles.titleSection}>
          <Typography.Title
            level={3}
            ellipsis={{ rows: 1, tooltip: displayName }}
            className={styles.profileTitle}
            style={{ margin: 0 }}
          >
            {displayName}
          </Typography.Title>

          <Typography.Text className={styles.subtitle}>
            {String(user.email)}
            {organizationName && ` · ${organizationName}`}
          </Typography.Text>

          <Flex align="center" gap={12} wrap="wrap" style={{ marginTop: 4 }}>
            <CopyableChip
              label="ID"
              value={user.id}
              displayValue={user.id.slice(0, 8)}
              mono
            />
          </Flex>
        </Flex>
      </Flex>
    </Paper>
  );
};
