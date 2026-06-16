"use client";

import { useState } from "react";
import {
  Button,
  Tag,
  Typography,
  Dropdown,
  Tooltip,
  Popover,
  Flex,
  Divider,
} from "antd";
import {
  CheckOutlined,
  MoreOutlined,
  LinkOutlined,
  EyeOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { CopyableChip } from "@/ui-kit/copyable-chip";
import { EntityStatus } from "@/mocks/products/types";
import {
  UserPopoverContent,
  SharePopoverContent,
} from "@/domains/inventory/products/components/product-info-header/components";
import { getStatusConfig } from "@/domains/inventory/products/components/product-info-header/utils";
import { useHeaderStyles } from "./category-info-header.styles";
import type { ICategoryDetail } from "../category-details-card/types";

// ============================================================================
// Types
// ============================================================================

interface ICategoryInfoHeaderProps {
  category: ICategoryDetail;
}

// ============================================================================
// Main Component
// ============================================================================

export const CategoryInfoHeader = ({ category }: ICategoryInfoHeaderProps) => {
  const { styles } = useHeaderStyles();
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const storefrontUrl = `${window.location.origin}/categories/${category.slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  };

  const handleOpenStorefront = () => {
    window.open(storefrontUrl, "_blank");
  };

  const handleCopyStorefrontLink = () => {
    navigator.clipboard.writeText(storefrontUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1500);
  };

  const statusConfig = getStatusConfig(category.status);

  const handleEditTitle = () => {
    console.log("Edit category title:", category.title);
  };

  const statusTitle = (
    <Flex align="center" gap={8}>
      <Tooltip title={statusConfig.hint}>
        <Tag
          color={statusConfig.color}
          icon={statusConfig.icon}
          className={styles.statusTag}
        >
          {statusConfig.label}
        </Tag>
      </Tooltip>
      {category.status === EntityStatus.PUBLISHED && (
        <Typography.Text type="secondary" className={styles.metaText}>
          {category.updatedAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
          <span style={{ marginLeft: 4 }}>by</span>
          <Popover
            content={
              <UserPopoverContent
                firstName="Admin"
                lastName="User"
                email="admin@shopana.io"
              />
            }
            placement="bottom"
            arrow={false}
          >
            <Button
              variant="text"
              color="primary"
              style={{
                padding: 0,
                height: "auto",
                marginLeft: 4,
                fontSize: "inherit",
              }}
            >
              Admin
            </Button>
          </Popover>
        </Typography.Text>
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
        <Button
          variant="text"
          color="default"
          size="small"
          icon={<EyeOutlined />}
          onClick={handleOpenStorefront}
          className={styles.actionButton}
        />
        <Popover
          content={
            <SharePopoverContent
              url={storefrontUrl}
              copied={shareCopied}
              onCopy={handleCopyStorefrontLink}
            />
          }
          trigger="click"
          placement="bottomRight"
          arrow={false}
        >
          <Button
            size="small"
            variant="text"
            color="default"
            icon={<ShareAltOutlined />}
            className={styles.actionButton}
          />
        </Popover>
      </Flex>
      <Dropdown
        menu={{
          items: [
            { key: "edit", label: "Edit title", onClick: handleEditTitle },
            { type: "divider" as const },
            { key: "duplicate", label: "Duplicate" },
            { key: "export", label: "Export" },
            { type: "divider" as const },
            { key: "archive", label: "Archive", danger: true },
          ],
        }}
        trigger={["click"]}
      >
        <Button size="small" icon={<MoreOutlined />} />
      </Dropdown>
    </Flex>
  );

  return (
    <Paper>
      {/* TOP BAR */}
      <PaperHeader title={statusTitle} actions={topBarActions} />

      {/* TITLE SECTION */}
      <Flex vertical gap={8}>
        <Typography.Title
          level={3}
          ellipsis={{ rows: 2, tooltip: category.title }}
          className={styles.categoryTitle}
          style={{ margin: 0 }}
        >
          {category.title || "Untitled Category"}
        </Typography.Title>

        <Flex align="center" gap={12}>
          <CopyableChip label="/" value={category.slug} />
          <CopyableChip
            label="ID"
            value={category.id}
            displayValue={category.id.slice(0, 8)}
            mono
          />
        </Flex>
      </Flex>

      <Divider className={styles.divider} />

      {/* DESCRIPTION */}
      {category.description && (
        <Typography.Paragraph
          type="secondary"
          ellipsis={{ rows: 2 }}
          style={{ margin: 0 }}
        >
          {category.description}
        </Typography.Paragraph>
      )}
    </Paper>
  );
};
