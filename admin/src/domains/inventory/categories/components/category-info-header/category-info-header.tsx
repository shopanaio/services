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
import { KPITile } from "@/ui-kit/kpi-tile";
import { PeriodSwitch } from "@/domains/inventory/products/components/period-switch";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  getStatusConfig,
} from "@/domains/inventory/products/components/product-info-header/utils";
import { formatDetailDate } from "@/domains/inventory/utils/format-detail-date";
import { PERIODS, type Period } from "@/domains/inventory/products/utils/periods";
import type { ApiCategory } from "@/graphql/types";
import { getCategoryRoutePath } from "../../utils/category-route-path";
import { useHeaderStyles } from "./category-info-header.styles";

interface CategoryInfoHeaderProps {
  category: ApiCategory;
  onEditIdentity?: () => void;
  onChangeStatus?: () => void;
  onArchive?: () => void;
  onEditSort?: () => void;
}

export const CategoryInfoHeader = ({
  category,
  onEditIdentity,
  onChangeStatus,
  onArchive,
  onEditSort,
}: CategoryInfoHeaderProps) => {
  const { styles } = useHeaderStyles();
  const [kpiPeriod, setKpiPeriod] = useState<Period>("7d");
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const categoryPath = getCategoryRoutePath(category);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const storefrontUrl = `${origin}/categories/${categoryPath}`;
  const statusConfig = getStatusConfig(
    category.isPublished ? "published" : "draft",
  );
  const statusActionLabel = category.isPublished ? "Unpublish" : "Publish";
  const kpi = {
    views: 2847,
    viewsTrend: 8,
    orders: 156,
    ordersTrend: -2,
    conversion: 5.5,
    conversionTrend: 0.4,
    revenue: 48200,
    revenueTrend: 12,
  };

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
          data-testid="category-detail-status"
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
              label: statusActionLabel,
              onClick: onChangeStatus,
            },
            {
              key: "sort",
              label: "Edit product sort",
              onClick: onEditSort,
            },
            { type: "divider" as const },
            {
              key: "archive",
              label: "Archive",
              danger: true,
              onClick: onArchive,
            },
          ],
        }}
        trigger={["click"]}
      >
        <Button
          size="small"
          icon={<MoreOutlined />}
          data-testid="category-header-actions-button"
        />
      </Dropdown>
    </Flex>
  );

  return (
    <Paper data-testid="category-header-section">
      <PaperHeader title={statusTitle} actions={topBarActions} />

      <Flex vertical gap={8}>
        <Typography.Title
          level={3}
          ellipsis={{ rows: 2, tooltip: category.name }}
          className={styles.categoryTitle}
          style={{ margin: 0 }}
          data-testid="category-detail-title"
        >
          {category.name || "Untitled Category"}
        </Typography.Title>

        <Flex align="center" gap={12} wrap="wrap">
          <CopyableChip
            label="/"
            value={categoryPath}
            data-testid="category-detail-path"
          />
          <CopyableChip
            label="ID"
            value={category.id}
            displayValue={category.id.slice(0, 8)}
            mono
          />
        </Flex>
      </Flex>

      {category.description?.text && (
        <>
          <Divider className={styles.divider} />
          <Typography.Paragraph
            type="secondary"
            ellipsis={{ rows: 2 }}
            style={{ margin: 0 }}
            data-testid="category-detail-description-summary"
          >
            {category.description.text}
          </Typography.Paragraph>
        </>
      )}

      <Divider className={styles.divider} />

      <div>
        <div style={{ marginBottom: 12 }}>
          <PeriodSwitch
            periods={PERIODS}
            value={kpiPeriod}
            onChange={setKpiPeriod}
            showCompare
            compareEnabled={compareEnabled}
            onCompareChange={setCompareEnabled}
          />
        </div>

        <Flex gap={12}>
          <KPITile
            label="Views"
            value={formatNumber(kpi.views)}
            trend={compareEnabled ? kpi.viewsTrend : undefined}
            tooltip="Total category page views"
            className={styles.kpiTile}
            dataTestId="category-kpi-views"
          />
          <KPITile
            label="Orders"
            value={formatNumber(kpi.orders)}
            trend={compareEnabled ? kpi.ordersTrend : undefined}
            tooltip="Orders containing products from this category"
            className={styles.kpiTile}
            dataTestId="category-kpi-orders"
          />
          <KPITile
            label="Conversion"
            value={formatPercent(kpi.conversion)}
            trend={compareEnabled ? kpi.conversionTrend : undefined}
            trendSuffix=" pp"
            tooltip="Category page conversion rate"
            className={styles.kpiTile}
            dataTestId="category-kpi-conversion"
          />
          <KPITile
            label="Revenue"
            value={formatCurrency(kpi.revenue)}
            trend={compareEnabled ? kpi.revenueTrend : undefined}
            tooltip="Total revenue from this category"
            className={styles.kpiTile}
            dataTestId="category-kpi-revenue"
          />
        </Flex>
      </div>
    </Paper>
  );
};
