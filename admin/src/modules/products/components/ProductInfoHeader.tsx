import { Paper } from '@components/paper/Paper';
import { Flex } from '@components/utility/Flex';
import { Box } from '@components/utility/Box';
import { css } from '@emotion/react';
import {
  Button,
  Tag,
  Typography,
  Tabs,
  Dropdown,
  Tooltip,
  Select,
  Switch,
  Progress,
} from 'antd';
import {
  CopyOutlined,
  MoreOutlined,
  ClockCircleFilled,
  WarningOutlined,
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
import { useIntl } from 'react-intl';
import { t as tCommon } from '@src/lang/messages';

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
  padding: 10px ${tokens.cardPadding}px;
  border-bottom: 1px solid ${tokens.borderColor};
  background: var(--color-gray-1);
  min-height: 44px;
`;

const titleSectionStyles = css`
  padding: 14px ${tokens.cardPadding}px 12px;
  border-bottom: 1px solid ${tokens.borderColor};
`;

const kpiSectionStyles = css`
  padding: ${tokens.sectionGap}px ${tokens.cardPadding}px;
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

const tabsSectionStyles = css`
  padding: 16px ${tokens.cardPadding}px ${tokens.cardPadding}px;
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

// Status Dot (for tabs)
type StatusDotVariant = 'success' | 'warning' | 'error' | 'default';

interface IStatusDotProps {
  variant?: StatusDotVariant;
  size?: number;
}

const StatusDot = ({ variant = 'success', size = 6 }: IStatusDotProps) => {
  const colors: Record<StatusDotVariant, string> = {
    success: tokens.colors.success,
    warning: tokens.colors.warning,
    error: tokens.colors.danger,
    default: 'var(--color-gray-5)',
  };

  return (
    <Box
      css={css`
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${colors[variant]};
        flex-shrink: 0;
      `}
    />
  );
};

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

const copyableChipStyles = css`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: var(--color-gray-2);
  border-radius: 4px;
  font-size: 11px;
  transition: background 0.2s;

  &:hover {
    background: var(--color-gray-3);
  }
`;

const CopyableChip = ({ label, value, displayValue, mono }: ICopyableChipProps) => (
  <Box css={copyableChipStyles}>
    {label && (
      <Typography.Text
        type="secondary"
        css={css`font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px;`}
      >
        {label}
      </Typography.Text>
    )}
    <Typography.Text
      copyable={{
        text: value,
        icon: <CopyOutlined css={css`font-size: 9px; color: var(--color-gray-5);`} />,
        tooltips: ['Copy', 'Copied!'],
      }}
      css={css`
        ${mono ? 'font-family: ui-monospace, SFMono-Regular, monospace;' : ''}
        font-size: 11px;
        color: var(--color-gray-8);
        .ant-typography-copy {
          margin-left: 4px;
          opacity: 0.6;
          transition: opacity 0.2s;
        }
        &:hover .ant-typography-copy {
          opacity: 1;
        }
      `}
    >
      {displayValue || value}
    </Typography.Text>
  </Box>
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
  const { formatMessage } = useIntl();
  const [kpiPeriod, setKpiPeriod] = useState<KPIPeriod>('7d');
  const [compareEnabled, setCompareEnabled] = useState(true);

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

  // Description preview extraction
  const getDescriptionPreview = () => {
    if (!product.description) return null;
    try {
      const parsed = JSON.parse(product.description);
      const extractText = (node: any): string => {
        if (node.text) return node.text;
        if (node.content) return node.content.map(extractText).join(' ');
        return '';
      };
      return extractText(parsed).slice(0, 300);
    } catch {
      return typeof product.description === 'string'
        ? product.description.slice(0, 300)
        : null;
    }
  };

  const descriptionPreview = getDescriptionPreview();

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

          {product.isVariableProduct && (
            <Tag color="purple" css={css`margin: 0; font-size: 11px;`}>
              {product.variants?.length || 0} variants
            </Tag>
          )}

          {/* Stock status badge */}
          <Tag
            color="green"
            css={css`margin: 0; font-size: 11px; font-weight: 400;`}
          >
            In stock
          </Tag>
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
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              css={css`height: 28px; width: 28px; padding: 0;`}
            />
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
          <CopyableChip value={product.slug} displayValue={`/${product.slug}`} />
          <CopyableChip label="ID" value={product.id} displayValue={product.id.slice(0, 8)} mono />
          {product.sku && <CopyableChip label="SKU" value={product.sku} mono />}
        </Flex>

        {/* C. META ROW */}
        <Flex
          align="center"
          gap="3"
          css={css`
            font-size: ${tokens.typography.meta.size}px;
            color: var(--color-gray-7);
          `}
        >
          <span>
            Created {product.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            <Typography.Text type="secondary" css={css`margin-left: 4px;`}>by Admin</Typography.Text>
          </span>
          <span css={css`color: var(--color-gray-5);`}>·</span>
          <span>
            Updated {product.updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            <Typography.Text type="secondary" css={css`margin-left: 4px;`}>by Admin</Typography.Text>
          </span>
          {product.status === EntityStatus.Published && (
            <>
              <span css={css`color: var(--color-gray-5);`}>·</span>
              <span>
                Published {product.updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </>
          )}
        </Flex>
      </Box>

      {/* ================================================================== */}
      {/* D. KPI PANEL */}
      {/* ================================================================== */}
      <Box css={kpiSectionStyles}>
        {/* Period Filter Row */}
        <Flex align="center" justify="space-between" css={css`margin-bottom: 12px;`}>
          <Flex align="center" gap="2">
            <Typography.Text
              type="secondary"
              css={css`font-size: 12px;`}
            >
              Period
            </Typography.Text>
            <Select
              value={kpiPeriod}
              onChange={setKpiPeriod}
              size="small"
              popupMatchSelectWidth={false}
              css={css`
                min-width: 110px;
                .ant-select-selector { font-size: 12px !important; }
              `}
            >
              <Select.Option value="7d">Last 7 days</Select.Option>
              <Select.Option value="30d">Last 30 days</Select.Option>
              <Select.Option value="90d">Last 90 days</Select.Option>
              <Select.Option value="ytd">Year to date</Select.Option>
              <Select.Option value="all">All time</Select.Option>
            </Select>
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

      {/* ================================================================== */}
      {/* E. CONTENT TABS */}
      {/* ================================================================== */}
      <Box css={tabsSectionStyles}>
        <Tabs
          size="small"
          css={css`
            .ant-tabs-nav {
              margin-bottom: 16px !important;
            }
            .ant-tabs-tab {
              padding: 8px 0 !important;
              font-size: 13px;
            }
          `}
          items={[
            {
              key: 'description',
              label: (
                <Flex align="center" gap="2">
                  <span>{formatMessage({ id: tCommon('common.description') })}</span>
                  <StatusDot variant={descriptionPreview ? 'success' : 'warning'} />
                </Flex>
              ),
              children: descriptionPreview ? (
                <Box>
                  {/* Content header */}
                  <Flex align="center" justify="space-between" css={css`margin-bottom: 8px;`}>
                    <Typography.Text type="secondary" css={css`font-size: 11px;`}>
                      {descriptionPreview.length}/500 characters
                    </Typography.Text>
                    <Flex gap="3">
                      <Button
                        type="primary"
                        ghost
                        size="small"
                        css={css`
                          height: 24px;
                          font-size: 11px;
                          padding: 0 10px;
                        `}
                      >
                        AI Assist
                      </Button>
                      <Button
                        type="text"
                        size="small"
                        onClick={() => handleEdit('description')}
                        css={css`
                          height: 24px;
                          font-size: 11px;
                          color: var(--color-gray-7);
                        `}
                      >
                        Edit
                      </Button>
                    </Flex>
                  </Flex>
                  {/* Progress bar under header */}
                  <Progress
                    percent={Math.min((descriptionPreview.length / 500) * 100, 100)}
                    showInfo={false}
                    strokeColor={descriptionPreview.length > 400 ? tokens.colors.success : 'var(--color-gray-4)'}
                    trailColor="var(--color-gray-2)"
                    size="small"
                    css={css`
                      margin: 0 0 12px 0;
                      .ant-progress-inner { height: 3px !important; }
                    `}
                  />
                  <Typography.Paragraph
                    ellipsis={{ rows: 3 }}
                    css={css`
                      margin: 0 !important;
                      font-size: 13px;
                      color: var(--color-gray-8);
                      line-height: 1.6;
                    `}
                  >
                    {descriptionPreview}
                    {descriptionPreview.length >= 300 && '...'}
                  </Typography.Paragraph>
                </Box>
              ) : (
                <Flex align="center" gap="2" css={css`padding: 16px 0;`}>
                  <WarningOutlined css={css`color: var(--color-gray-5);`} />
                  <Typography.Text type="secondary" css={css`font-size: 12px;`}>
                    No description added
                  </Typography.Text>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => handleEdit('description')}
                    css={css`padding: 0; height: auto;`}
                  >
                    Add now
                  </Button>
                </Flex>
              ),
            },
            {
              key: 'excerpt',
              label: (
                <Flex align="center" gap="2">
                  <span>{formatMessage({ id: tCommon('common.excerpt') })}</span>
                  <StatusDot variant={product.excerpt ? 'success' : 'default'} />
                </Flex>
              ),
              children: product.excerpt ? (
                <Box>
                  {/* Content header */}
                  <Flex align="center" justify="space-between" css={css`margin-bottom: 8px;`}>
                    <Typography.Text type="secondary" css={css`font-size: 11px;`}>
                      {product.excerpt.length}/200 characters
                    </Typography.Text>
                    <Button
                      type="text"
                      size="small"
                      onClick={() => handleEdit('excerpt')}
                      css={css`
                        height: 24px;
                        font-size: 11px;
                        color: var(--color-gray-7);
                      `}
                    >
                      Edit
                    </Button>
                  </Flex>
                  {/* Progress bar under header */}
                  <Progress
                    percent={Math.min((product.excerpt.length / 200) * 100, 100)}
                    showInfo={false}
                    strokeColor={product.excerpt.length > 150 ? tokens.colors.success : 'var(--color-gray-4)'}
                    trailColor="var(--color-gray-2)"
                    size="small"
                    css={css`
                      margin: 0 0 12px 0;
                      .ant-progress-inner { height: 3px !important; }
                    `}
                  />
                  <Typography.Paragraph
                    ellipsis={{ rows: 3 }}
                    css={css`
                      margin: 0 !important;
                      font-size: 13px;
                      color: var(--color-gray-8);
                      line-height: 1.6;
                    `}
                  >
                    {product.excerpt}
                  </Typography.Paragraph>
                </Box>
              ) : (
                <Flex align="center" gap="2" css={css`padding: 16px 0;`}>
                  <WarningOutlined css={css`color: var(--color-gray-5);`} />
                  <Typography.Text type="secondary" css={css`font-size: 12px;`}>
                    No excerpt added
                  </Typography.Text>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => handleEdit('excerpt')}
                    css={css`padding: 0; height: auto;`}
                  >
                    Add now
                  </Button>
                </Flex>
              ),
            },
          ]}
        />
      </Box>
    </Paper>
  );
};
