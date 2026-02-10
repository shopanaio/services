"use client";

import { ReactNode, useState } from "react";
import { Button, Tag, Typography, Dropdown, Tooltip, Flex, Avatar } from "antd";
import {
  CheckOutlined,
  MoreOutlined,
  LinkOutlined,
  BankOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { createStyles } from "antd-style";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { CopyableChip } from "@/ui-kit/copyable-chip";
import type { ApiOrganization } from "@/graphql/types";

// ============================================================================
// Types
// ============================================================================

export interface IOrganizationInfoHeaderProps {
  organization: ApiOrganization;
  onEdit?: () => void;
  children?: ReactNode;
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
  organizationTitle: {
    marginBottom: 0,
  },
}));

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

export const OrganizationInfoHeader = ({
  organization,
  onEdit,
  children,
}: IOrganizationInfoHeaderProps) => {
  const { styles } = useStyles();
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  };

  const statusTitle = (
    <Flex align="center" gap={8}>
      <Tooltip title="Organization is active">
        <Tag
          color="success"
          icon={<CheckCircleOutlined />}
          className={styles.statusTag}
        >
          Active
        </Tag>
      </Tooltip>
      <Typography.Text type="secondary" className={styles.metaText}>
        Created {formatDate(organization.createdAt)}
      </Typography.Text>
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
          items: [{ key: "edit", label: "Edit organization", onClick: onEdit }],
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
          src={organization.logo?.url}
          icon={<BankOutlined />}
          className={styles.avatar}
          onClick={onEdit}
        >
          {getInitials(organization.displayName)}
        </Avatar>

        <Flex vertical gap={8} className={styles.titleSection}>
          <Typography.Title
            level={3}
            ellipsis={{ rows: 1, tooltip: organization.displayName }}
            className={styles.organizationTitle}
            style={{ margin: 0 }}
          >
            {organization.displayName}
          </Typography.Title>

          <Flex align="center" gap={12} wrap="wrap">
            <CopyableChip label="/" value={organization.name} />
            <CopyableChip
              label="ID"
              value={organization.id}
              displayValue={organization.id.slice(0, 8)}
              mono
            />
          </Flex>
        </Flex>
      </Flex>
      {children}
    </Paper>
  );
};
