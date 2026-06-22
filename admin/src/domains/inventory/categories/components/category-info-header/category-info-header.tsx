"use client";

import { useState } from "react";
import {
  Button,
  Divider,
  Dropdown,
  Flex,
  Popover,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  CheckOutlined,
  EyeOutlined,
  LinkOutlined,
  MoreOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { CopyableChip } from "@/ui-kit/copyable-chip";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import {
  SharePopoverContent,
  UserPopoverContent,
} from "@/domains/inventory/products/components/product-info-header/components";
import { getStatusConfig } from "@/domains/inventory/products/components/product-info-header/utils";
import { formatDetailDate } from "@/domains/inventory/utils/format-detail-date";
import type { ApiCategory } from "@/graphql/types";
import { useHeaderStyles } from "./category-info-header.styles";

interface CategoryInfoHeaderProps {
  category: ApiCategory;
  onEditIdentity?: () => void;
  onChangeStatus?: () => void;
  onEditSort?: () => void;
}

export const CategoryInfoHeader = ({
  category,
  onEditIdentity,
  onChangeStatus,
  onEditSort,
}: CategoryInfoHeaderProps) => {
  const { styles } = useHeaderStyles();
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const categoryPath = category.path || category.handle;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const storefrontUrl = `${origin}/categories/${categoryPath}`;
  const statusConfig = getStatusConfig(
    category.isPublished ? "published" : "draft",
  );

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
      <Typography.Text type="secondary" className={styles.metaText}>
        Updated {formatDetailDate(category.updatedAt)}
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
            {
              key: "identity",
              label: "Edit identity",
              onClick: onEditIdentity,
            },
            {
              key: "status",
              label: "Change status",
              onClick: onChangeStatus,
            },
            {
              key: "sort",
              label: "Edit product sort",
              onClick: onEditSort,
            },
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
      <PaperHeader title={statusTitle} actions={topBarActions} />

      <Flex vertical gap={8}>
        <Typography.Title
          level={3}
          ellipsis={{ rows: 2, tooltip: category.name }}
          className={styles.categoryTitle}
          style={{ margin: 0 }}
        >
          {category.name || "Untitled Category"}
        </Typography.Title>

        <Flex align="center" gap={12} wrap="wrap">
          <CopyableChip label="/" value={categoryPath} />
          <CopyableChip
            label="ID"
            value={category.id}
            displayValue={category.id.slice(0, 8)}
            mono
          />
          <CopyableChip
            label="Revision"
            value={String(category.revision)}
            displayValue={String(category.revision)}
            mono
          />
        </Flex>
      </Flex>

      <Divider className={styles.divider} />

      {category.description?.text && (
        <Typography.Paragraph
          type="secondary"
          ellipsis={{ rows: 2 }}
          style={{ margin: 0 }}
        >
          {category.description.text}
        </Typography.Paragraph>
      )}
    </Paper>
  );
};
