import { Paper } from '@components/paper/Paper';
import { Flex } from '@components/utility/Flex';
import { Box } from '@components/utility/Box';
import { css } from '@emotion/react';
import {
  Avatar,
  Button,
  Tag,
  Typography,
  Dropdown,
  Tooltip,
  Switch,
  Popover,
} from 'antd';
import {
  CopyOutlined,
  CheckOutlined,
  MoreOutlined,
  ClockCircleFilled,
  StopOutlined,
  LinkOutlined,
  EyeOutlined,
  ShareAltOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { ReactNode, useState } from 'react';
import { IProduct } from '@src/entity/Product/Product';
import { EntityStatus } from '@src/graphql';

// ============================================================================
// Design Tokens (Enterprise)
// ============================================================================

const tokens = {
  cardPadding: 24,
  sectionGap: 16,
  borderRadius: 8,
  borderColor: 'var(--color-gray-3)',
  typography: {
    title: { size: 24, weight: 600 },
    kpiValue: { size: 20, weight: 600 },
    kpiLabel: { size: 12, weight: 500 },
    label: { size: 12, weight: 500 },
    meta: { size: 12, weight: 400 },
    small: { size: 11, weight: 400 },
  },
  colors: {
    text: 'var(--color-gray-9)',
    textSecondary: 'var(--color-gray-6)',
    success: '#52c41a',
    warning: '#faad14',
    danger: '#ff4d4f',
    info: '#1677ff',
  },
};

// ============================================================================
// Types
// ============================================================================

type KPIPeriod = '7d' | '30d' | '90d' | 'ytd' | 'all';

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

const cardStyles = css`
  padding: 0;
  overflow: hidden;
  border-radius: ${tokens.borderRadius}px;
`;

const topBarStyles = css`
  padding: var(--x3);
  border-bottom: 1px solid ${tokens.borderColor};
  background: var(--color-gray-1);
`;

const titleSectionStyles = css`
  padding: var(--x3);
  border-bottom: 1px solid ${tokens.borderColor};
`;

const kpiSectionStyles = css`
  padding: var(--x3);
  border-bottom: 1px solid ${tokens.borderColor};
`;

const kpiTileStyles = css`
  flex: 1;
  padding: 12px 16px;
  background: var(--color-gray-1);
  border-radius: 6px;
  border: 1px solid var(--color-gray-3);
  min-width: 0;

  &:hover {
    background: var(--color-gray-2);
    border-color: var(--color-gray-4);
  }
`;


// ============================================================================
// Helper Functions
// ============================================================================

const getStatusConfig = (status: EntityStatus) => {
  switch (status) {
    case EntityStatus.Published:
      return {
        color: 'success' as const,
        icon: <CheckCircleFilled />,
        label: 'Published',
        hint: null,
      };
    case EntityStatus.Draft:
      return {
        color: 'default' as const,
        icon: <ClockCircleFilled />,
        label: 'Draft',
        hint: 'Not visible on storefront',
      };
    case EntityStatus.Archived:
      return {
        color: 'error' as const,
        icon: <StopOutlined />,
        label: 'Archived',
        hint: 'Product is archived',
      };
    default:
      return {
        color: 'default' as const,
        icon: null,
        label: status,
        hint: null,
      };
  }
};

// Full numbers for CMS accuracy (no abbreviations)
const formatNumber = (num: number): string => {
  return num.toLocaleString('ru-RU');
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
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

// Trend Indicator (compact badge style)
interface ITrendProps {
  value: number;
  suffix?: string;
}

const TrendIndicator = ({ value, suffix = '%' }: ITrendProps) => {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const color = isNeutral
    ? 'var(--color-gray-6)'
    : isPositive
      ? tokens.colors.success
      : tokens.colors.danger;
  const bgColor = isNeutral
    ? 'var(--color-gray-2)'
    : isPositive
      ? 'rgba(82, 196, 26, 0.1)'
      : 'rgba(255, 77, 79, 0.1)';

  return (
    <Box
      css={css`
        display: inline-flex;
        align-items: center;
        gap: 2px;
        padding: 1px 6px;
        border-radius: 10px;
        background: ${bgColor};
        font-size: 10px;
        font-weight: 500;
        color: ${color};
        white-space: nowrap;
      `}
    >
      {!isNeutral && (
        <span css={css`font-size: 8px;`}>
          {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
        </span>
      )}
      <span>{isPositive ? '+' : ''}{value}</span>
      {suffix && (
        <span
          css={css`
            font-size: 8px;
            font-weight: 400;
            opacity: 0.6;
          `}
        >
          {suffix}
        </span>
      )}
    </Box>
  );
};

// KPI Tile
interface IKPITileProps {
  label: string;
  value: ReactNode;
  trend?: number;
  trendSuffix?: string;
  tooltip?: string;
}

const KPITile = ({ label, value, trend, trendSuffix = '%', tooltip }: IKPITileProps) => (
  <Tooltip title={tooltip}>
    <Box css={kpiTileStyles}>
      <Typography.Text
        css={css`
          font-size: ${tokens.typography.kpiValue.size}px;
          font-weight: ${tokens.typography.kpiValue.weight};
          display: block;
          line-height: 1.2;
          color: ${tokens.colors.text};
        `}
      >
        {value}
      </Typography.Text>
      <Flex align="center" gap="2" css={css`margin-top: 4px;`}>
        <Typography.Text
          type="secondary"
          css={css`
            font-size: ${tokens.typography.kpiLabel.size}px;
            font-weight: ${tokens.typography.kpiLabel.weight};
          `}
        >
          {label}
        </Typography.Text>
        {trend !== undefined && <TrendIndicator value={trend} suffix={trendSuffix} />}
      </Flex>
    </Box>
  </Tooltip>
);

// Copyable ID/Slug chip (with background)
interface ICopyableChipProps {
  label?: string;
  value: string;
  displayValue?: string;
  mono?: boolean;
}

const CopyableChip = ({ label, value, displayValue, mono }: ICopyableChipProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Tooltip title={copied ? 'Copied!' : undefined}>
      <Tag
        color="default"
        onClick={handleCopy}
        css={css`
          cursor: pointer;
          margin: 0;
          display: inline-flex;
          align-items: center;
          gap: 0;
        `}
      >
        {label && (
          <Typography.Text
            type="secondary"
            css={css`font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; margin-right: 4px;`}
          >
            {label}
          </Typography.Text>
        )}
        <Typography.Text
          css={css`
            ${mono ? 'font-family: ui-monospace, SFMono-Regular, monospace;' : ''}
            font-size: 11px;
            color: var(--color-gray-8);
          `}
        >
          {displayValue || value}
        </Typography.Text>
        {copied ? (
          <CheckOutlined css={css`font-size: 9px; color: var(--color-green-6);`} />
        ) : (
          <CopyOutlined css={css`font-size: 9px; color: var(--color-gray-7);`} />
        )}
      </Tag>
    </Tooltip>
  );
};

// User Popover Content
interface IUserPopoverProps {
  firstName: string;
  lastName: string;
  email: string;
}

const UserPopoverContent = ({ firstName, lastName, email }: IUserPopoverProps) => (
  <Flex align="center" gap="3" css={css`padding: 4px 0;`}>
    <Avatar
      size={40}
      css={css`
        background-color: var(--color-purple-2);
        color: var(--color-purple-6);
        flex-shrink: 0;
      `}
    >
      {firstName.charAt(0)}{lastName.charAt(0)}
    </Avatar>
    <Box>
      <Typography.Text
        strong
        css={css`display: block; font-size: 14px; line-height: 1.4;`}
      >
        {firstName} {lastName}
      </Typography.Text>
      <Typography.Text
        type="secondary"
        css={css`font-size: 12px;`}
      >
        {email}
      </Typography.Text>
    </Box>
  </Flex>
);

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
  const [kpiPeriod, setKpiPeriod] = useState<KPIPeriod>('7d');
  const [compareEnabled, setCompareEnabled] = useState(false);

  const statusConfig = getStatusConfig(product.status);

  const handleEdit = (section: string) => onEditSection?.(section);

  // Mock KPI data if not provided
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

  return (
    <Paper css={cardStyles}>
      {/* ================================================================== */}
      {/* A. TOP BAR */}
      {/* ================================================================== */}
      <Flex align="center" justify="space-between" css={topBarStyles}>
        {/* Left: Status + Context */}
        <Flex align="center" gap="2">
          <Tooltip title={statusConfig.hint}>
            <Tag
              color={statusConfig.color}
              icon={statusConfig.icon}
              css={css`
                margin: 0;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                font-weight: 500;
                font-size: 12px;
              `}
            >
              {statusConfig.label}
            </Tag>
          </Tooltip>
          {product.status === EntityStatus.Published && (
            <Typography.Text
              type="secondary"
              css={css`
                font-size: ${tokens.typography.meta.size}px;
              `}
            >
              {product.updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              <span css={css`margin-left: 4px;`}>by</span>
              <Popover
                content={<UserPopoverContent firstName="Admin" lastName="User" email="admin@shopana.io" />}
                placement="bottom"
                arrow={false}
              >
                <Button variant="link" color="primary" css={css`padding: 0; height: auto; margin-left: 4px; font-size: inherit;`}>Admin</Button>
              </Popover>
            </Typography.Text>
          )}
        </Flex>

        {/* Right: Quick Actions */}
        <Flex align="center" gap="1">
          <Tooltip title="Open on storefront">
            <Button
              type="text"
              size="small"
              icon={<LinkOutlined />}
              onClick={onViewStorefront}
              css={css`height: 28px; width: 28px; padding: 0;`}
            />
          </Tooltip>
          <Tooltip title="Preview">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={onPreview}
              css={css`height: 28px; width: 28px; padding: 0;`}
            />
          </Tooltip>
          <Tooltip title="Share">
            <Button
              type="text"
              size="small"
              icon={<ShareAltOutlined />}
              onClick={onShare}
              css={css`height: 28px; width: 28px; padding: 0;`}
            />
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                { key: 'duplicate', label: 'Duplicate product' },
                { key: 'export', label: 'Export' },
                { type: 'divider' as const },
                { key: 'archive', label: 'Archive', danger: true },
              ],
              onClick: ({ key }) => handleEdit(key),
            }}
            trigger={['click']}
          >
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Flex>
      </Flex>

      {/* ================================================================== */}
      {/* B. TITLE SECTION */}
      {/* ================================================================== */}
      <Box css={titleSectionStyles}>
        {/* Product Title */}
        <Typography.Title
          level={4}
          ellipsis={{ rows: 1, tooltip: product.title }}
          css={css`
            margin: 0 0 6px 0 !important;
            font-size: ${tokens.typography.title.size}px !important;
            font-weight: ${tokens.typography.title.weight} !important;
            line-height: 1.3 !important;
          `}
        >
          {product.title || 'Untitled Product'}
        </Typography.Title>

        {/* Service Line: Slug + ID + SKU */}
        <Flex align="center" gap="3" css={css`margin-bottom: 10px;`}>
          <CopyableChip label="/" value={product.slug} />
          <CopyableChip label="ID" value={product.id} displayValue={product.id.slice(0, 8)} mono />
          {product.sku && <CopyableChip label="SKU" value={product.sku} mono />}
        </Flex>
      </Box>

      {/* ================================================================== */}
      {/* D. KPI PANEL */}
      {/* ================================================================== */}
      <Box css={kpiSectionStyles}>
        {/* Period Filter Row */}
        <Flex align="center" justify="space-between" css={css`margin-bottom: 12px;`}>
          <Flex align="center" gap="1">
            {([
              { value: '7d', label: '7D' },
              { value: '30d', label: '30D' },
              { value: '90d', label: '90D' },
              { value: 'ytd', label: 'YTD' },
              { value: 'all', label: 'All' },
            ] as const).map((period) => (
              <Tag
                key={period.value}
                onClick={() => setKpiPeriod(period.value)}
                css={css`
                  margin: 0;
                  cursor: pointer;
                  font-size: 11px;
                  padding: 2px 8px;
                  border-radius: 4px;
                  user-select: none;
                  transition: all 0.2s;
                  ${kpiPeriod === period.value
                    ? `
                      background: var(--color-gray-9);
                      color: #fff;
                      border-color: var(--color-gray-9);
                    `
                    : `
                      background: var(--color-gray-1);
                      color: var(--color-gray-7);
                      border-color: var(--color-gray-4);
                      &:hover {
                        border-color: var(--color-gray-6);
                        color: var(--color-gray-9);
                      }
                    `}
                `}
              >
                {period.label}
              </Tag>
            ))}
          </Flex>
          <Flex align="center" gap="2">
            <Typography.Text
              type="secondary"
              css={css`
                font-size: 12px;
                cursor: pointer;
                user-select: none;
              `}
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

        {/* KPI Tiles */}
        <Flex gap="3">
          <KPITile
            label="Views"
            value={formatNumber(kpi.views)}
            trend={compareEnabled ? kpi.viewsTrend : undefined}
            tooltip="Total page views"
          />
          <KPITile
            label="Orders"
            value={formatNumber(kpi.orders)}
            trend={compareEnabled ? kpi.ordersTrend : undefined}
            tooltip="Orders containing this product"
          />
          <KPITile
            label="Conversion"
            value={formatPercent(kpi.conversion)}
            trend={compareEnabled ? kpi.conversionTrend : undefined}
            trendSuffix=" pp"
            tooltip="Add to cart conversion rate"
          />
          <KPITile
            label="Revenue"
            value={formatCurrency(kpi.revenue)}
            trend={compareEnabled ? kpi.revenueTrend : undefined}
            tooltip="Total revenue from this product"
          />
        </Flex>
      </Box>
    </Paper>
  );
};
