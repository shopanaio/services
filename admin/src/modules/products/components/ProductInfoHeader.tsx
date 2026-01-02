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
} from 'antd';
import {
  CopyOutlined,
  MoreOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
  ClockCircleFilled,
  WarningOutlined,
  StopOutlined,
  LinkOutlined,
  EyeOutlined,
  ShareAltOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
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
  padding: 12px ${tokens.cardPadding}px;
  border-bottom: 1px solid ${tokens.borderColor};
  background: var(--color-gray-1);
`;

const titleSectionStyles = css`
  padding: ${tokens.sectionGap}px ${tokens.cardPadding}px;
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

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
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

// Trend Indicator
interface ITrendProps {
  value: number;
  suffix?: string;
}

const TrendIndicator = ({ value, suffix = '%' }: ITrendProps) => {
  const isPositive = value > 0;
  const isNeutral = value === 0;

  return (
    <Typography.Text
      css={css`
        font-size: 11px;
        font-weight: 500;
        color: ${isNeutral
          ? 'var(--color-gray-6)'
          : isPositive
            ? tokens.colors.success
            : tokens.colors.danger};
        display: inline-flex;
        align-items: center;
        gap: 2px;
      `}
    >
      {!isNeutral && (isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />)}
      {isPositive ? '+' : ''}{value}{suffix}
    </Typography.Text>
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

// Copyable ID/Slug chip
interface ICopyableChipProps {
  label?: string;
  value: string;
  displayValue?: string;
  mono?: boolean;
}

const CopyableChip = ({ label, value, displayValue, mono }: ICopyableChipProps) => (
  <Flex align="center" gap="1" css={css`font-size: 11px;`}>
    {label && <Typography.Text type="secondary">{label}:</Typography.Text>}
    <Typography.Text
      copyable={{
        text: value,
        icon: <CopyOutlined css={css`font-size: 10px; color: var(--color-gray-5);`} />,
        tooltips: ['Copy', 'Copied!'],
      }}
      css={css`
        ${mono ? 'font-family: monospace;' : ''}
        font-size: 11px;
        color: var(--color-gray-7);
        .ant-typography-copy { margin-left: 2px; }
      `}
    >
      {displayValue || value}
    </Typography.Text>
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

  // SEO issues count (mock)
  const seoIssuesCount = (!product.seoTitle ? 1 : 0) + (!product.seoDescription ? 1 : 0);

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
            margin: 0 0 8px 0 !important;
            font-size: ${tokens.typography.title.size}px !important;
            font-weight: ${tokens.typography.title.weight} !important;
            line-height: 1.3 !important;
          `}
        >
          {product.title || 'Untitled Product'}
        </Typography.Title>

        {/* Service Line: Slug + ID + SKU */}
        <Flex align="center" gap="4" css={css`margin-bottom: 12px;`}>
          <CopyableChip value={product.slug} displayValue={`/${product.slug}`} />
          <CopyableChip label="ID" value={product.id} displayValue={product.id.slice(0, 8)} mono />
          {product.sku && <CopyableChip label="SKU" value={product.sku} mono />}
        </Flex>

        {/* C. META ROW */}
        <Flex align="center" gap="3" css={css`font-size: ${tokens.typography.meta.size}px; color: ${tokens.colors.textSecondary};`}>
          <span>
            Created: {product.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {/* In enterprise would add: " by Admin" */}
          </span>
          <span>·</span>
          <span>
            Updated: {product.updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          {product.status === EntityStatus.Published && (
            <>
              <span>·</span>
              <span>
                Last published: {product.updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
              css={css`font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;`}
            >
              Period:
            </Typography.Text>
            <Select
              value={kpiPeriod}
              onChange={setKpiPeriod}
              size="small"
              popupMatchSelectWidth={false}
              css={css`
                min-width: 100px;
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
            <Typography.Text type="secondary" css={css`font-size: 11px;`}>
              Compare to previous
            </Typography.Text>
            <Button
              type={compareEnabled ? 'primary' : 'default'}
              size="small"
              onClick={() => setCompareEnabled(!compareEnabled)}
              css={css`
                height: 22px;
                font-size: 11px;
                padding: 0 8px;
                ${!compareEnabled && 'color: var(--color-gray-6); border-color: var(--color-gray-4);'}
              `}
            >
              {compareEnabled ? 'On' : 'Off'}
            </Button>
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
                <Flex align="center" gap="1">
                  <span>{formatMessage({ id: tCommon('common.description') })}</span>
                  {descriptionPreview && (
                    <CheckCircleFilled css={css`font-size: 10px; color: ${tokens.colors.success};`} />
                  )}
                </Flex>
              ),
              children: descriptionPreview ? (
                <Box>
                  {/* Content header */}
                  <Flex align="center" justify="space-between" css={css`margin-bottom: 8px;`}>
                    <Typography.Text type="secondary" css={css`font-size: 11px;`}>
                      Characters: {descriptionPreview.length}/500
                    </Typography.Text>
                    <Flex gap="2">
                      <Button type="link" size="small" css={css`padding: 0; height: auto; font-size: 11px;`}>
                        AI Assist
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => handleEdit('description')}
                        css={css`padding: 0; height: auto; font-size: 11px;`}
                      >
                        Edit
                      </Button>
                    </Flex>
                  </Flex>
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
                <Flex align="center" gap="1">
                  <span>{formatMessage({ id: tCommon('common.excerpt') })}</span>
                  {product.excerpt && (
                    <CheckCircleFilled css={css`font-size: 10px; color: ${tokens.colors.success};`} />
                  )}
                </Flex>
              ),
              children: product.excerpt ? (
                <Box>
                  <Flex align="center" justify="space-between" css={css`margin-bottom: 8px;`}>
                    <Typography.Text type="secondary" css={css`font-size: 11px;`}>
                      Characters: {product.excerpt.length}/200
                    </Typography.Text>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => handleEdit('excerpt')}
                      css={css`padding: 0; height: auto; font-size: 11px;`}
                    >
                      Edit
                    </Button>
                  </Flex>
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
            {
              key: 'seo',
              label: (
                <Flex align="center" gap="1">
                  <span>{formatMessage({ id: tCommon('common.seo') })}</span>
                  {seoIssuesCount > 0 ? (
                    <Tag
                      color="error"
                      css={css`
                        margin: 0;
                        font-size: 10px;
                        line-height: 14px;
                        padding: 0 4px;
                        border-radius: 10px;
                      `}
                    >
                      {seoIssuesCount}
                    </Tag>
                  ) : (
                    <CheckCircleFilled css={css`font-size: 10px; color: ${tokens.colors.success};`} />
                  )}
                </Flex>
              ),
              children: (
                <Box
                  css={css`
                    background: var(--color-gray-1);
                    border-radius: 6px;
                    padding: 12px 16px;
                  `}
                >
                  {/* SEO Issues Summary */}
                  {seoIssuesCount > 0 && (
                    <Flex
                      align="center"
                      gap="2"
                      css={css`
                        margin-bottom: 12px;
                        padding-bottom: 12px;
                        border-bottom: 1px solid var(--color-gray-3);
                      `}
                    >
                      <ExclamationCircleFilled css={css`color: ${tokens.colors.danger}; font-size: 14px;`} />
                      <Typography.Text css={css`font-size: 12px; color: ${tokens.colors.danger};`}>
                        {seoIssuesCount} SEO {seoIssuesCount === 1 ? 'issue' : 'issues'} found
                      </Typography.Text>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => handleEdit('seo')}
                        css={css`padding: 0; height: auto; font-size: 12px; margin-left: auto;`}
                      >
                        Fix now
                      </Button>
                    </Flex>
                  )}

                  {/* Google Preview */}
                  <Typography.Text
                    type="secondary"
                    css={css`font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;`}
                  >
                    Search preview
                  </Typography.Text>
                  <Box css={css`margin-top: 8px;`}>
                    <Typography.Text
                      css={css`
                        font-size: 16px;
                        color: #1a0dab;
                        display: block;
                        line-height: 1.3;
                        &:hover { text-decoration: underline; }
                      `}
                    >
                      {product.seoTitle || product.title || 'Untitled Product'}
                    </Typography.Text>
                    <Typography.Text
                      css={css`
                        font-size: 12px;
                        color: #006621;
                        display: block;
                        margin-top: 2px;
                      `}
                    >
                      yourstore.com › products › {product.slug}
                    </Typography.Text>
                    <Typography.Paragraph
                      ellipsis={{ rows: 2 }}
                      css={css`
                        margin: 4px 0 0 0 !important;
                        font-size: 13px;
                        color: var(--color-gray-7);
                        line-height: 1.5;
                      `}
                    >
                      {product.seoDescription || product.excerpt || descriptionPreview || 'No description available for this product.'}
                    </Typography.Paragraph>
                  </Box>

                  {/* Configure button if no custom SEO */}
                  {!product.seoTitle && !product.seoDescription && (
                    <Flex
                      align="center"
                      gap="2"
                      css={css`
                        margin-top: 12px;
                        padding-top: 12px;
                        border-top: 1px solid var(--color-gray-3);
                      `}
                    >
                      <WarningOutlined css={css`color: ${tokens.colors.warning}; font-size: 12px;`} />
                      <Typography.Text type="secondary" css={css`font-size: 11px;`}>
                        Using auto-generated SEO data
                      </Typography.Text>
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => handleEdit('seo')}
                        css={css`margin-left: auto; font-size: 11px; height: 24px;`}
                      >
                        Configure SEO
                      </Button>
                    </Flex>
                  )}
                </Box>
              ),
            },
          ]}
        />
      </Box>
    </Paper>
  );
};
