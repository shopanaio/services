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
import { KPITile } from "@/ui-kit/kpi-tile";
import { PeriodSwitch, PERIODS, type Period } from "../period-switch";
import { EntityStatus } from "@/mocks/products/types";
import { useProductEditTitleModal } from "../../modals";
import { useHeaderStyles } from "./product-info-header.styles";
import {
  CopyableChip,
  UserPopoverContent,
  SharePopoverContent,
} from "./components";
import {
  getStatusConfig,
  formatNumber,
  formatCurrency,
  formatPercent,
} from "./utils";
import type { IProductInfoHeaderProps, IKPIData } from "./types";

export const ProductInfoHeader = ({
  product,
  kpiData,
}: IProductInfoHeaderProps) => {
  const { styles } = useHeaderStyles();
  const [kpiPeriod, setKpiPeriod] = useState<Period>("7d");
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const { push: openEditTitleModal } = useProductEditTitleModal();

  const storefrontUrl = `${window.location.origin}/products/${product.slug}`;

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

  const statusConfig = getStatusConfig(product.status);

  const handleEditTitle = () => {
    openEditTitleModal({
      title: product.title,
      handle: product.slug,
      onSave: (values: { title: string; handle: string }) => {
        console.log("Save title:", values);
        // TODO: implement actual save logic
      },
    });
  };

  const kpi: IKPIData = kpiData || {
    views: 2847,
    viewsTrend: 8,
    orders: 156,
    ordersTrend: -2,
    conversion: 5.5,
    conversionTrend: 0.4,
    revenue: product.price * 156,
    revenueTrend: 12,
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
      {product.status === EntityStatus.PUBLISHED && (
        <Typography.Text type="secondary" className={styles.metaText}>
          {product.updatedAt.toLocaleDateString("en-US", {
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
            { key: "duplicate", label: "Duplicate product" },
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
          ellipsis={{ rows: 2, tooltip: product.title }}
          className={styles.productTitle}
          style={{ margin: 0 }}
        >
          {product.title || "Untitled Product"}
        </Typography.Title>

        <Flex align="center" gap={12}>
          <CopyableChip label="/" value={product.slug} />
          <CopyableChip
            label="ID"
            value={product.id}
            displayValue={product.id.slice(0, 8)}
            mono
          />
          {product.sku && <CopyableChip label="SKU" value={product.sku} mono />}
        </Flex>
      </Flex>

      <Divider className={styles.divider} />

      {/* KPI PANEL */}
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
            tooltip="Total page views"
            className={styles.kpiTile}
          />
          <KPITile
            label="Orders"
            value={formatNumber(kpi.orders)}
            trend={compareEnabled ? kpi.ordersTrend : undefined}
            tooltip="Orders containing this product"
            className={styles.kpiTile}
          />
          <KPITile
            label="Conversion"
            value={formatPercent(kpi.conversion)}
            trend={compareEnabled ? kpi.conversionTrend : undefined}
            trendSuffix=" pp"
            tooltip="Add to cart conversion rate"
            className={styles.kpiTile}
          />
          <KPITile
            label="Revenue"
            value={formatCurrency(kpi.revenue)}
            trend={compareEnabled ? kpi.revenueTrend : undefined}
            tooltip="Total revenue from this product"
            className={styles.kpiTile}
          />
        </Flex>
      </div>
    </Paper>
  );
};
