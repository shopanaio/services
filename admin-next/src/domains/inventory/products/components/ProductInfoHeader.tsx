import { createStyles } from "antd-style";
import {
  Avatar,
  Button,
  Tag,
  Typography,
  Dropdown,
  Tooltip,
  Switch,
  Popover,
  Flex,
  Divider,
} from "antd";
import {
  CopyOutlined,
  CheckOutlined,
  MoreOutlined,
  ClockCircleFilled,
  StopOutlined,
  LinkOutlined,
  EyeOutlined,
  ShareAltOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";
import { useState } from "react";
import { Paper } from "./Paper";
import { PaperHeader } from "./PaperHeader";
import { Tile } from "./Tile";
import { IProduct, EntityStatus } from "../mocks/types";

// ============================================================================
// Types
// ============================================================================

type KPIPeriod = "7d" | "30d" | "90d" | "ytd" | "all";

interface IKPIData {
  views: number;
  viewsTrend: number;
  orders: number;
  ordersTrend: number;
  conversion: number;
  conversionTrend: number;
  revenue: number;
  revenueTrend: number;
}

interface IProductInfoHeaderProps {
  product: IProduct;
  onEditSection?: (section: string) => void;
  onViewStorefront?: () => void;
  onPreview?: () => void;
  onShare?: () => void;
  kpiData?: IKPIData;
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
  productTitle: {
    "&&": {
      margin: "0 0 6px 0",
      fontSize: 24,
      fontWeight: 600,
      lineHeight: 1.3,
    },
  },
  divider: {
    marginBlock: token.margin,
  },
  copyableChip: {
    cursor: "pointer",
    margin: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: 0,
  },
  chipLabel: {
    fontSize: token.fontSizeSM,
    textTransform: "uppercase",
    letterSpacing: "0.3px",
    marginRight: 4,
  },
  chipValue: {
    fontSize: 11,
    color: token.colorTextSecondary,
  },
  chipValueMono: {
    fontSize: 11,
    color: token.colorTextSecondary,
    fontFamily: "ui-monospace, SFMono-Regular, monospace",
  },
  chipIcon: {
    fontSize: 9,
    color: token.colorTextTertiary,
  },
  chipIconSuccess: {
    fontSize: 9,
    color: token.colorSuccess,
  },
  periodTag: {
    margin: 0,
    cursor: "pointer",
    fontSize: token.fontSizeSM,
    padding: "2px 8px",
    userSelect: "none",
    transition: "all 0.2s",
  },
  periodTagActive: {
    background: token.colorText,
    color: token.colorBgContainer,
    borderColor: token.colorText,
  },
  periodTagInactive: {
    background: token.colorBgLayout,
    color: token.colorTextSecondary,
    borderColor: token.colorBorder,
    "&:hover": {
      borderColor: token.colorTextTertiary,
      color: token.colorText,
    },
  },
  userPopover: {
    padding: "4px 0",
  },
  userAvatar: {
    backgroundColor: token.purple2,
    color: token.purple6,
    flexShrink: 0,
  },
  userName: {
    display: "block",
    fontSize: 14,
    lineHeight: 1.4,
  },
  userEmail: {
    fontSize: 12,
  },
  // Tile overrides for header KPIs
  kpiTile: {
    padding: "12px 16px",
    background: token.colorBgElevated,
  },
  kpiTileValue: {
    fontSize: 20,
  },
}));

// ============================================================================
// Helper Functions
// ============================================================================

const getStatusConfig = (status: EntityStatus) => {
  switch (status) {
    case EntityStatus.PUBLISHED:
      return {
        color: "success" as const,
        icon: <CheckCircleFilled />,
        label: "Published",
        hint: null,
      };
    case EntityStatus.DRAFT:
      return {
        color: "default" as const,
        icon: <ClockCircleFilled />,
        label: "Draft",
        hint: "Not visible on storefront",
      };
    case EntityStatus.ARCHIVED:
      return {
        color: "error" as const,
        icon: <StopOutlined />,
        label: "Archived",
        hint: "Product is archived",
      };
    default:
      return {
        color: "default" as const,
        icon: null,
        label: status,
        hint: null,
      };
  }
};

const formatNumber = (num: number): string => {
  return num.toLocaleString("ru-RU");
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
};

const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// ============================================================================
// Sub-components
// ============================================================================

interface ICopyableChipProps {
  label?: string;
  value: string;
  displayValue?: string;
  mono?: boolean;
}

const CopyableChip = ({
  label,
  value,
  displayValue,
  mono,
}: ICopyableChipProps) => {
  const { styles } = useStyles();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Tooltip title={copied ? "Copied!" : undefined}>
      <Tag
        color="default"
        onClick={handleCopy}
        className={styles.copyableChip}
        variant="outlined"
      >
        {label && (
          <Typography.Text type="secondary" className={styles.chipLabel}>
            {label}
          </Typography.Text>
        )}
        <Typography.Text
          className={mono ? styles.chipValueMono : styles.chipValue}
        >
          {displayValue || value}
        </Typography.Text>
        {copied ? (
          <CheckOutlined className={styles.chipIconSuccess} />
        ) : (
          <CopyOutlined className={styles.chipIcon} />
        )}
      </Tag>
    </Tooltip>
  );
};

interface IUserPopoverProps {
  firstName: string;
  lastName: string;
  email: string;
}

const UserPopoverContent = ({
  firstName,
  lastName,
  email,
}: IUserPopoverProps) => {
  const { styles } = useStyles();

  return (
    <Flex align="center" gap={12} className={styles.userPopover}>
      <Avatar size={40} className={styles.userAvatar}>
        {firstName.charAt(0)}
        {lastName.charAt(0)}
      </Avatar>
      <div>
        <Typography.Text strong className={styles.userName}>
          {firstName} {lastName}
        </Typography.Text>
        <Typography.Text type="secondary" className={styles.userEmail}>
          {email}
        </Typography.Text>
      </div>
    </Flex>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ProductInfoHeader = ({
  product,
  onEditSection,
  onViewStorefront,
  onPreview,
  onShare,
  kpiData,
}: IProductInfoHeaderProps) => {
  const { styles, cx } = useStyles();
  const [kpiPeriod, setKpiPeriod] = useState<KPIPeriod>("7d");
  const [compareEnabled, setCompareEnabled] = useState(false);

  const statusConfig = getStatusConfig(product.status);

  const handleEdit = (section: string) => onEditSection?.(section);

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
          variant="outlined"
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
    <Flex align="center" gap={4}>
      <Tooltip title="Open on storefront">
        <Button
          variant="text"
          color="primary"
          icon={<LinkOutlined />}
          onClick={onViewStorefront}
          className={styles.actionButton}
        />
      </Tooltip>
      <Tooltip title="Preview">
        <Button
          variant="text"
          color="primary"
          icon={<EyeOutlined />}
          onClick={onPreview}
          className={styles.actionButton}
        />
      </Tooltip>
      <Tooltip title="Share">
        <Button
          variant="text"
          color="primary"
          icon={<ShareAltOutlined />}
          onClick={onShare}
          className={styles.actionButton}
        />
      </Tooltip>
      <Dropdown
        menu={{
          items: [
            { key: "duplicate", label: "Duplicate product" },
            { key: "export", label: "Export" },
            { type: "divider" as const },
            { key: "archive", label: "Archive", danger: true },
          ],
          onClick: ({ key }) => handleEdit(key),
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
      <div>
        <Typography.Title
          level={4}
          ellipsis={{ rows: 1, tooltip: product.title }}
          className={styles.productTitle}
        >
          {product.title || "Untitled Product"}
        </Typography.Title>

        <Flex align="center" gap={12} style={{ marginBottom: 10 }}>
          <CopyableChip label="/" value={product.slug} />
          <CopyableChip
            label="ID"
            value={product.id}
            displayValue={product.id.slice(0, 8)}
            mono
          />
          {product.sku && <CopyableChip label="SKU" value={product.sku} mono />}
        </Flex>
      </div>

      <Divider className={styles.divider} />

      {/* KPI PANEL */}
      <div>
        <Flex
          align="center"
          justify="space-between"
          style={{ marginBottom: 12 }}
        >
          <Flex align="center" gap={4}>
            {(
              [
                { value: "7d", label: "7D" },
                { value: "30d", label: "30D" },
                { value: "90d", label: "90D" },
                { value: "ytd", label: "YTD" },
                { value: "all", label: "All" },
              ] as const
            ).map((period) => (
              <Tag
                variant="outlined"
                key={period.value}
                onClick={() => setKpiPeriod(period.value)}
                className={cx(
                  styles.periodTag,
                  kpiPeriod === period.value
                    ? styles.periodTagActive
                    : styles.periodTagInactive
                )}
              >
                {period.label}
              </Tag>
            ))}
          </Flex>
          <Flex align="center" gap={8}>
            <Typography.Text
              type="secondary"
              style={{ fontSize: 12, cursor: "pointer", userSelect: "none" }}
              onClick={() => setCompareEnabled(!compareEnabled)}
            >
              Compare to previous
            </Typography.Text>
            <Switch
              size="small"
              checked={compareEnabled}
              onChange={setCompareEnabled}
            />
          </Flex>
        </Flex>

        <Flex gap={12}>
          <Tile
            label="Views"
            value={formatNumber(kpi.views)}
            trend={compareEnabled ? kpi.viewsTrend : undefined}
            tooltip="Total page views"
            className={styles.kpiTile}
          />
          <Tile
            label="Orders"
            value={formatNumber(kpi.orders)}
            trend={compareEnabled ? kpi.ordersTrend : undefined}
            tooltip="Orders containing this product"
            className={styles.kpiTile}
          />
          <Tile
            label="Conversion"
            value={formatPercent(kpi.conversion)}
            trend={compareEnabled ? kpi.conversionTrend : undefined}
            trendSuffix=" pp"
            tooltip="Add to cart conversion rate"
            className={styles.kpiTile}
          />
          <Tile
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
