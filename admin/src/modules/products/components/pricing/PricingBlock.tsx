import { css } from '@emotion/react';
import {
  Typography,
  Button,
  Select,
  Tag,
  Tooltip,
  Dropdown,
  Segmented,
} from 'antd';
import {
  EditOutlined,
  MoreOutlined,
  InfoCircleOutlined,
  HistoryOutlined,
  WarningOutlined,
  CheckCircleFilled,
  SyncOutlined,
} from '@ant-design/icons';
import { ReactNode, useState, useMemo, useCallback } from 'react';
import { Paper } from '@components/paper/Paper';
import { Flex } from '@components/utility/Flex';
import { Box } from '@components/utility/Box';
import {
  IPriceHistoryRecord,
  generateMockHistory,
  getMockVariantPrices,
} from './PriceHistory';

// ============================================================================
// Types
// ============================================================================

type PriceSource = 'manual' | 'rule-based' | 'promo' | 'market';
type TimeRange = '7D' | '30D' | '90D';
type MarginStatus = 'ok' | 'warning' | 'critical';
type SyncStatus = 'synced' | 'delayed' | 'manual';

interface IPricingData {
  currentPrice: number;
  previousPrice: number | null;
  compareAtPrice: number | null;
  costPrice: number | null;
  margin: number | null;
  marginStatus: MarginStatus;
  minAllowedPrice: number | null;
  maxPrice: number | null;
  priceSource: PriceSource;
  priceHistory: IPriceHistoryRecord[];
  lastUpdatedAt: Date;
  changesCount: number;
  targetMargin?: number;
  syncStatus?: SyncStatus;
}

interface IVariantOption {
  id: string;
  title: string;
  price: number;
  margin: number | null;
  hasWarning: boolean;
}

// ============================================================================
// Design Tokens
// ============================================================================

const tokens = {
  padding: {
    card: 16,
    section: 12,
  },
  gap: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
  },
  borderRadius: 8,
  fontSize: {
    price: 32,
    secondary: 14,
    kpiValue: 16,
    kpiLabel: 11,
    helper: 10,
  },
  colors: {
    success: '#52c41a',
    successMuted: '#95de64', // Softer green for "You save"
    warning: '#faad14',
    danger: '#ff4d4f',
    info: '#1677ff',
    muted: 'var(--color-gray-6)',
    mutedDark: 'var(--color-gray-7)', // Darker for section headers
    border: 'var(--color-gray-3)',
    bgSubtle: 'var(--color-gray-1)',
  },
};

// Non-breaking space for currency formatting
const NBSP = '\u00A0';

// ============================================================================
// Styles
// ============================================================================

const cardStyles = css`
  padding: ${tokens.padding.card}px;
  min-height: auto;
`;

const headerStyles = css`
  margin-bottom: ${tokens.gap.md}px;
  padding-bottom: ${tokens.gap.sm}px;
  border-bottom: 1px solid ${tokens.colors.border};
`;

const twoColumnStyles = css`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${tokens.gap.lg}px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const columnStyles = css`
  padding: ${tokens.padding.section}px;
  background: ${tokens.colors.bgSubtle};
  border-radius: ${tokens.borderRadius}px;
`;

const kpiRowStyles = css`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: ${tokens.gap.sm}px;
  margin-top: ${tokens.gap.lg}px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const kpiTileStyles = css`
  padding: ${tokens.gap.sm}px ${tokens.gap.md}px;
  background: ${tokens.colors.bgSubtle};
  border-radius: 6px;
  border: 1px solid ${tokens.colors.border};
  text-align: center;
  min-height: 72px;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

// ============================================================================
// Helper Functions
// ============================================================================

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffMs / 86400000)}d ago`;
};

const formatShortDate = (date: Date): string => {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
  }).format(date);
};

const getMarginStatus = (
  margin: number | null,
  target: number = 35,
): MarginStatus => {
  if (margin === null) return 'warning';
  if (margin < target - 10) return 'critical';
  if (margin < target) return 'warning';
  return 'ok';
};

const getMarginColor = (status: MarginStatus): string => {
  switch (status) {
    case 'ok':
      return tokens.colors.success;
    case 'warning':
      return tokens.colors.warning;
    case 'critical':
      return tokens.colors.danger;
  }
};

const getPriceSourceLabel = (source: PriceSource): string => {
  switch (source) {
    case 'manual':
      return 'Manual';
    case 'rule-based':
      return 'Rule-based';
    case 'promo':
      return 'Promo';
    case 'market':
      return 'Market';
  }
};

const getSyncStatusConfig = (status: SyncStatus) => {
  switch (status) {
    case 'synced':
      return {
        icon: <CheckCircleFilled />,
        color: tokens.colors.success,
        label: 'Synced',
      };
    case 'delayed':
      return {
        icon: <SyncOutlined />,
        color: tokens.colors.warning,
        label: 'Delayed',
      };
    case 'manual':
      return {
        icon: <EditOutlined />,
        color: tokens.colors.muted,
        label: 'Manual',
      };
  }
};

// ============================================================================
// Sub-components
// ============================================================================

// Header
interface IPricingHeaderProps {
  title: string;
  variants?: IVariantOption[];
  selectedVariantId?: string;
  onVariantSelect?: (id: string) => void;
  lastUpdatedAt: Date;
  syncStatus?: SyncStatus;
  onEdit?: () => void;
  onMoreAction?: (action: string) => void;
}

const PricingHeader = ({
  title,
  variants,
  selectedVariantId,
  onVariantSelect,
  lastUpdatedAt,
  syncStatus = 'synced',
  onEdit,
  onMoreAction,
}: IPricingHeaderProps) => {
  const selectedVariant = variants?.find((v) => v.id === selectedVariantId);
  const syncConfig = getSyncStatusConfig(syncStatus);

  const moreMenuItems = [
    { key: 'history', label: 'View price history' },
    { key: 'audit', label: 'View audit log' },
    { key: 'compare', label: 'Compare variants' },
    { type: 'divider' as const },
    { key: 'rules', label: 'Pricing rules' },
    { key: 'export', label: 'Export data' },
  ];

  return (
    <Flex align="center" justify="space-between" css={headerStyles}>
      <Flex align="center" gap="3">
        <Typography.Text
          strong
          css={css`
            font-size: 13px;
          `}
        >
          {title}
        </Typography.Text>

        {variants && variants.length > 1 && (
          <Flex align="center" gap="2">
            <Select
              value={selectedVariantId}
              onChange={onVariantSelect}
              size="small"
              popupMatchSelectWidth={false}
              css={css`
                min-width: 160px;
                .ant-select-selector {
                  font-size: 12px !important;
                }
              `}
              labelRender={() => (
                <Flex align="center" gap="1">
                  <span>{selectedVariant?.title || 'Select variant'}</span>
                  {selectedVariant?.hasWarning && (
                    <WarningOutlined
                      css={css`
                        color: ${tokens.colors.warning};
                        font-size: 10px;
                      `}
                    />
                  )}
                </Flex>
              )}
              options={variants.map((v) => ({
                value: v.id,
                label: (
                  <Flex
                    justify="space-between"
                    align="center"
                    css={css`
                      width: 100%;
                    `}
                  >
                    <span>{v.title}</span>
                    <Flex align="center" gap="2">
                      {v.hasWarning && (
                        <WarningOutlined
                          css={css`
                            color: ${tokens.colors.warning};
                            font-size: 10px;
                          `}
                        />
                      )}
                    </Flex>
                  </Flex>
                ),
              }))}
            />
            <Tag
              css={css`
                margin: 0;
                font-size: 10px;
                line-height: 16px;
              `}
            >
              {variants.length} variants
            </Tag>
          </Flex>
        )}
      </Flex>

      <Flex align="center" gap="2">
        {/* Updated time with sync status */}
        <Tooltip title={`Last update: ${lastUpdatedAt.toLocaleString()}`}>
          <Flex
            align="center"
            gap="1"
            css={css`
              font-size: 11px;
              color: var(--color-gray-6);
            `}
          >
            <span>Updated {formatRelativeTime(lastUpdatedAt)}</span>
            <span
              css={css`
                color: ${syncConfig.color};
                display: flex;
                align-items: center;
              `}
            >
              · {syncConfig.icon}
            </span>
          </Flex>
        </Tooltip>

        {onEdit && (
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={onEdit}
          >
            Edit price
          </Button>
        )}

        {onMoreAction && (
          <Dropdown
            menu={{
              items: moreMenuItems,
              onClick: ({ key }) => onMoreAction(key),
            }}
            trigger={['click']}
          >
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
        )}
      </Flex>
    </Flex>
  );
};

// Current Price Column
interface ICurrentPriceColumnProps {
  data: IPricingData;
  formatPrice: (amount: number) => string;
}

const CurrentPriceColumn = ({
  data,
  formatPrice,
}: ICurrentPriceColumnProps) => {
  const {
    currentPrice,
    compareAtPrice,
    priceSource,
    margin,
    marginStatus,
    targetMargin = 35,
  } = data;

  const saving =
    compareAtPrice && compareAtPrice > currentPrice
      ? compareAtPrice - currentPrice
      : null;
  const discountPercent =
    saving && compareAtPrice
      ? Math.round((saving / compareAtPrice) * 100)
      : null;

  return (
    <Box css={columnStyles}>
      {/* Section header - darker */}
      <Typography.Text
        css={css`
          font-size: ${tokens.fontSize.helper}px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: ${tokens.gap.sm}px;
          color: ${tokens.colors.mutedDark};
          font-weight: 500;
        `}
      >
        Current price
      </Typography.Text>

      {/* Main Price */}
      <Typography.Text
        strong
        css={css`
          font-size: ${tokens.fontSize.price}px;
          font-weight: 600;
          display: block;
          line-height: 1.2;
          white-space: nowrap;
        `}
      >
        {formatPrice(currentPrice)}
      </Typography.Text>

      {/* Badges Row - discount stronger, source subtle */}
      <Flex
        align="center"
        gap="2"
        css={css`
          margin-top: ${tokens.gap.sm}px;
        `}
      >
        {discountPercent && (
          <Tag
            color="green"
            css={css`
              margin: 0;
              font-size: 11px;
              font-weight: 600;
            `}
          >
            -{discountPercent}%
          </Tag>
        )}
        {/* Source badge - subtle, with tooltip */}
        <Tooltip
          title={
            priceSource === 'manual'
              ? 'Price set manually by user'
              : priceSource === 'rule-based'
              ? 'Price calculated by pricing rule'
              : priceSource === 'promo'
              ? 'Promotional price active'
              : 'Market-based pricing'
          }
        >
          <Tag
            css={css`
              margin: 0;
              font-size: 10px;
              background: transparent;
              border: 1px solid var(--color-gray-4);
              color: var(--color-gray-6);
              cursor: help;
            `}
          >
            {getPriceSourceLabel(priceSource)}
          </Tag>
        </Tooltip>
      </Flex>

      {/* Was / Save Row - subtle green for save */}
      {compareAtPrice && compareAtPrice > currentPrice && (
        <Flex
          align="center"
          gap="3"
          css={css`
            margin-top: ${tokens.gap.md}px;
            font-size: 13px;
          `}
        >
          <Typography.Text type="secondary">
            Was:{NBSP}
            <Typography.Text delete type="secondary">
              {formatPrice(compareAtPrice)}
            </Typography.Text>
          </Typography.Text>
          {saving && (
            <Typography.Text
              css={css`
                color: ${tokens.colors.successMuted};
                font-size: 12px;
              `}
            >
              Save{NBSP}
              {formatPrice(saving)}
            </Typography.Text>
          )}
        </Flex>
      )}

      {/* Margin Status */}
      <Flex
        align="center"
        gap="2"
        css={css`
          margin-top: ${tokens.gap.md}px;
          padding-top: ${tokens.gap.md}px;
          border-top: 1px solid ${tokens.colors.border};
        `}
      >
        {marginStatus === 'warning' && (
          <Tooltip title={`Below target margin (${targetMargin}%)`}>
            <Tag
              color="warning"
              css={css`
                margin: 0;
                font-size: 10px;
                line-height: 16px;
                cursor: help;
              `}
            >
              <WarningOutlined /> Below target
            </Tag>
          </Tooltip>
        )}

        {marginStatus === 'critical' && (
          <Tooltip
            title={`Critical: margin significantly below target (${targetMargin}%)`}
          >
            <Tag
              color="error"
              css={css`
                margin: 0;
                font-size: 10px;
                line-height: 16px;
                cursor: help;
              `}
            >
              <WarningOutlined /> Below min margin
            </Tag>
          </Tooltip>
        )}
      </Flex>
    </Box>
  );
};

// Price History Chart - Enhanced
interface IPriceHistoryChartProps {
  history: IPriceHistoryRecord[];
  formatPrice: (amount: number) => string;
  changesCount: number;
  onViewLog?: () => void;
}

const PriceHistoryChart = ({
  history,
  formatPrice,
  changesCount,
  onViewLog,
}: IPriceHistoryChartProps) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30D');
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    price: number;
    date: Date;
    isMin?: boolean;
    isMax?: boolean;
    isCurrent?: boolean;
  } | null>(null);

  // Filter history based on time range
  const filteredHistory = useMemo(() => {
    const now = new Date();
    const days = timeRange === '7D' ? 7 : timeRange === '30D' ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return history.filter((h) => h.effectiveFrom >= cutoff);
  }, [history, timeRange]);

  const prices = useMemo(
    () => [...filteredHistory].reverse().map((h) => h.amount),
    [filteredHistory],
  );
  const min = prices.length > 0 ? Math.min(...prices) : 0;
  const max = prices.length > 0 ? Math.max(...prices) : 0;

  // Chart dimensions
  const width = 320;
  const height = 140;
  const padding = { top: 20, right: 20, bottom: 35, left: 20 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Generate chart points
  const range = max - min || 1;
  const points = prices.map((price, i) => {
    const x = padding.left + (i / Math.max(prices.length - 1, 1)) * chartWidth;
    const y = padding.top + chartHeight - ((price - min) / range) * chartHeight;
    const record = filteredHistory[filteredHistory.length - 1 - i];
    return {
      x,
      y,
      price,
      date: record?.effectiveFrom || new Date(),
      isMin: price === min,
      isMax: price === max,
      isCurrent: record?.isCurrent,
    };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`)
    .join(' ');
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x},${
          padding.top + chartHeight
        } L ${points[0].x},${padding.top + chartHeight} Z`
      : '';

  // Grid lines (only 3 for cleaner look)
  const gridLines = [0, 0.5, 1].map((ratio) => ({
    y: padding.top + chartHeight * (1 - ratio),
    value: min + range * ratio,
  }));

  // Time axis markers
  const timeMarkers = useMemo(() => {
    if (points.length < 2) return [];
    const step = Math.max(1, Math.floor(points.length / 4));
    return points.filter(
      (_, i) => i === 0 || i === points.length - 1 || i % step === 0,
    );
  }, [points]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (points.length < 2) return;

      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;

      // Find closest point
      let closest = points[0];
      let minDist = Math.abs(mouseX - points[0].x);

      for (const point of points) {
        const dist = Math.abs(mouseX - point.x);
        if (dist < minDist) {
          minDist = dist;
          closest = point;
        }
      }

      if (minDist < 30) {
        setHoveredPoint(closest);
      } else {
        setHoveredPoint(null);
      }
    },
    [points],
  );

  // Find min/max points for markers
  const minPoint = points.find((p) => p.isMin);
  const maxPoint = points.find((p) => p.isMax);
  const currentPoint = points.find((p) => p.isCurrent);

  return (
    <Box css={columnStyles}>
      <Flex
        align="center"
        justify="space-between"
        css={css`
          margin-bottom: ${tokens.gap.sm}px;
        `}
      >
        {/* Section header - darker */}
        <Typography.Text
          css={css`
            font-size: ${tokens.fontSize.helper}px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: ${tokens.colors.mutedDark};
            font-weight: 500;
          `}
        >
          Price history
        </Typography.Text>

        <Segmented
          size="small"
          value={timeRange}
          onChange={(value) => setTimeRange(value as TimeRange)}
          options={[
            { value: '7D', label: '7D' },
            { value: '30D', label: '30D' },
            { value: '90D', label: '90D' },
          ]}
          css={css`
            .ant-segmented-item {
              min-width: 36px;
            }
          `}
        />
      </Flex>

      {/* SVG Chart */}
      <svg
        width={width}
        height={height}
        css={css`
          display: block;
          max-width: 100%;
          cursor: crosshair;
        `}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPoint(null)}
      >
        {/* Grid lines */}
        {gridLines.map((line, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={line.y}
              x2={width - padding.right}
              y2={line.y}
              stroke="var(--color-gray-3)"
              strokeDasharray="2,2"
            />
          </g>
        ))}

        {/* Area fill */}
        {areaPath && <path d={areaPath} fill="rgba(22, 119, 255, 0.08)" />}

        {/* Line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={tokens.colors.info}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {points.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={hoveredPoint === point ? 5 : 3}
            fill={hoveredPoint === point ? tokens.colors.info : 'white'}
            stroke={tokens.colors.info}
            strokeWidth="2"
          />
        ))}

        {/* Min marker - neutral color */}
        {minPoint && minPoint !== hoveredPoint && (
          <g>
            <circle
              cx={minPoint.x}
              cy={minPoint.y}
              r="4"
              fill="white"
              stroke="var(--color-gray-5)"
              strokeWidth="2"
            />
            <text
              x={minPoint.x}
              y={minPoint.y + 14}
              textAnchor="middle"
              fill="var(--color-gray-6)"
              fontSize="9"
            >
              min
            </text>
          </g>
        )}

        {/* Max marker - neutral color */}
        {maxPoint && maxPoint !== hoveredPoint && maxPoint !== minPoint && (
          <g>
            <circle
              cx={maxPoint.x}
              cy={maxPoint.y}
              r="4"
              fill="white"
              stroke="var(--color-gray-5)"
              strokeWidth="2"
            />
            <text
              x={maxPoint.x}
              y={maxPoint.y - 8}
              textAnchor="middle"
              fill="var(--color-gray-6)"
              fontSize="9"
            >
              max
            </text>
          </g>
        )}

        {/* Current marker */}
        {currentPoint && currentPoint !== hoveredPoint && (
          <circle
            cx={currentPoint.x}
            cy={currentPoint.y}
            r="5"
            fill={tokens.colors.info}
            stroke="white"
            strokeWidth="2"
          />
        )}

        {/* Time axis markers */}
        {timeMarkers.map((point, i) => (
          <text
            key={i}
            x={point.x}
            y={height - 8}
            textAnchor="middle"
            fill="var(--color-gray-5)"
            fontSize="9"
          >
            {formatShortDate(point.date)}
          </text>
        ))}

        {/* Hover tooltip - enhanced with date */}
        {hoveredPoint && (
          <g>
            {/* Vertical line */}
            <line
              x1={hoveredPoint.x}
              y1={padding.top}
              x2={hoveredPoint.x}
              y2={height - padding.bottom}
              stroke={tokens.colors.info}
              strokeDasharray="3,3"
              opacity="0.5"
            />
            {/* Tooltip box */}
            <rect
              x={Math.min(Math.max(hoveredPoint.x - 55, 5), width - 115)}
              y={Math.max(hoveredPoint.y - 48, 5)}
              width={110}
              height={40}
              rx={4}
              fill="var(--color-gray-9)"
            />
            {/* Price */}
            <text
              x={Math.min(Math.max(hoveredPoint.x, 60), width - 60)}
              y={Math.max(hoveredPoint.y - 30, 20)}
              textAnchor="middle"
              fill="white"
              fontSize="12"
              fontWeight="600"
            >
              {formatPrice(hoveredPoint.price)}
            </text>
            {/* Date */}
            <text
              x={Math.min(Math.max(hoveredPoint.x, 60), width - 60)}
              y={Math.max(hoveredPoint.y - 15, 35)}
              textAnchor="middle"
              fill="rgba(255,255,255,0.7)"
              fontSize="10"
            >
              {formatShortDate(hoveredPoint.date)}
            </text>
          </g>
        )}
      </svg>
    </Box>
  );
};

// KPI Tile - consistent height
interface IKPITileProps {
  label: string;
  value: ReactNode;
  subLabel?: string;
  tooltip?: string;
  variant?: 'default' | 'warning' | 'danger';
}

const KPITile = ({
  label,
  value,
  subLabel,
  tooltip,
  variant = 'default',
}: IKPITileProps) => {
  const borderColor =
    variant === 'warning'
      ? tokens.colors.warning
      : variant === 'danger'
      ? tokens.colors.danger
      : 'transparent';

  const content = (
    <Box
      css={css`
        ${kpiTileStyles};
        ${borderColor !== 'transparent'
          ? `border-left: 2px solid ${borderColor};`
          : ''}
      `}
    >
      <Flex
        align="center"
        justify="center"
        gap="1"
        css={css`
          margin-bottom: 2px;
        `}
      >
        <Typography.Text
          css={css`
            font-size: ${tokens.fontSize.kpiLabel}px;
            color: var(--color-gray-7);
            text-transform: uppercase;
            letter-spacing: 0.3px;
          `}
        >
          {label}
        </Typography.Text>
        {tooltip && (
          <InfoCircleOutlined
            css={css`
              font-size: 9px;
              color: var(--color-gray-5);
            `}
          />
        )}
      </Flex>
      <Typography.Text
        css={css`
          font-size: ${tokens.fontSize.kpiValue}px;
          font-weight: 500;
          display: block;
          white-space: nowrap;
        `}
      >
        {value}
      </Typography.Text>
      {subLabel && (
        <Typography.Text
          css={css`
            font-size: ${tokens.fontSize.helper}px;
            color: var(--color-gray-6);
            display: block;
            margin-top: 2px;
          `}
        >
          {subLabel}
        </Typography.Text>
      )}
    </Box>
  );

  if (tooltip) {
    return <Tooltip title={tooltip}>{content}</Tooltip>;
  }
  return content;
};

// KPI Row
interface IKPIRowProps {
  data: IPricingData;
  formatPrice: (amount: number) => string;
}

const KPIRow = ({ data, formatPrice }: IKPIRowProps) => {
  const {
    costPrice,
    margin,
    marginStatus,
    minAllowedPrice,
    maxPrice,
    priceHistory,
    changesCount,
    currentPrice,
  } = data;

  const prices = priceHistory.map((h) => h.amount);
  const avg30d =
    prices.length > 0
      ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      : null;

  return (
    <Box css={kpiRowStyles}>
      <KPITile
        label="Cost"
        value={costPrice ? formatPrice(costPrice) : '—'}
        tooltip={costPrice ? 'Product cost price' : 'Cost data missing'}
        variant={!costPrice ? 'warning' : 'default'}
      />
      <KPITile
        label="Margin"
        value={
          <Typography.Text
            css={css`
              color: ${getMarginColor(marginStatus)};
            `}
          >
            {margin !== null ? `${margin}%` : '—'}
          </Typography.Text>
        }
        subLabel={
          margin !== null && costPrice
            ? formatPrice(currentPrice - costPrice)
            : undefined
        }
        tooltip="Profit margin percentage"
        variant={
          marginStatus === 'critical'
            ? 'danger'
            : marginStatus === 'warning'
            ? 'warning'
            : 'default'
        }
      />
      <KPITile
        label="Min allowed"
        value={minAllowedPrice ? formatPrice(minAllowedPrice) : '—'}
        subLabel="Policy"
        tooltip="Minimum price allowed by pricing policy"
      />
      <KPITile
        label="Max"
        value={maxPrice ? formatPrice(maxPrice) : '—'}
        subLabel="Market"
        tooltip="Maximum historical price"
      />
      <KPITile
        label="Avg 30D"
        value={avg30d ? formatPrice(avg30d) : '—'}
        subLabel="Internal avg"
        tooltip="Average price over last 30 days"
      />
      <KPITile
        label="Changes"
        value={changesCount}
        subLabel="30D"
        tooltip="Number of price changes in last 30 days"
      />
    </Box>
  );
};

// ============================================================================
// Main Component
// ============================================================================

interface IPricingBlockProps {
  // Product data
  price: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  priceHistory?: IPriceHistoryRecord[];

  // Variant support
  variants?: Array<{
    id: string;
    title: string;
    price: number;
    compareAtPrice?: number | null;
    costPrice?: number | null;
  }>;
  selectedVariantId?: string;
  onVariantSelect?: (id: string) => void;

  // Config
  title?: string;
  priceSource?: PriceSource;
  minAllowedPrice?: number | null;
  targetMargin?: number;
  lastUpdatedAt?: Date;
  syncStatus?: SyncStatus;

  // Callbacks
  onEdit?: () => void;
  onViewLog?: () => void;
  onMoreAction?: (action: string) => void;

  // Formatting
  formatPrice?: (amount: number) => string;
}

export const PricingBlock = ({
  price,
  compareAtPrice,
  costPrice,
  priceHistory: priceHistoryProp,
  variants,
  selectedVariantId: selectedVariantIdProp,
  onVariantSelect,
  title = 'Pricing',
  priceSource = 'manual',
  minAllowedPrice,
  targetMargin = 35,
  lastUpdatedAt = new Date(),
  syncStatus = 'synced',
  onEdit,
  onViewLog,
  onMoreAction,
  formatPrice: formatPriceProp,
}: IPricingBlockProps) => {
  // State for variant selection
  const [internalSelectedVariantId, setInternalSelectedVariantId] = useState<
    string | undefined
  >(variants?.[0]?.id);
  const selectedVariantId = selectedVariantIdProp ?? internalSelectedVariantId;

  const handleVariantSelect = (id: string) => {
    setInternalSelectedVariantId(id);
    onVariantSelect?.(id);
  };

  // Default price formatter with non-breaking space
  const formatPrice =
    formatPriceProp ||
    ((amount: number) => {
      const formatted = new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 0,
      }).format(amount / 100);
      // Replace regular space before currency symbol with non-breaking space
      return formatted.replace(/\s+/g, NBSP);
    });

  // Get variant prices if available
  const variantPrices = useMemo(() => {
    if (!variants?.length) return null;
    return getMockVariantPrices(variants);
  }, [variants]);

  // Selected variant data
  const selectedVariantData = variantPrices?.find(
    (v) => v.variantId === selectedVariantId,
  );

  // Determine actual values (from variant or props)
  const actualPrice = selectedVariantData?.currentPrice ?? price;
  const actualCompareAtPrice =
    selectedVariantData?.compareAtPrice ?? compareAtPrice;
  const actualCostPrice = selectedVariantData?.costPrice ?? costPrice;
  const actualPriceHistory =
    selectedVariantData?.priceHistory ??
    priceHistoryProp ??
    generateMockHistory(price, compareAtPrice);

  // Calculate margin
  const margin =
    actualCostPrice && actualCostPrice > 0
      ? Math.round(((actualPrice - actualCostPrice) / actualPrice) * 100)
      : null;
  const marginStatus = getMarginStatus(margin, targetMargin);

  // Calculate max price from history
  const maxPrice = Math.max(...actualPriceHistory.map((h) => h.amount));
  const changesCount = actualPriceHistory.length - 1;

  // Build pricing data
  const pricingData: IPricingData = {
    currentPrice: actualPrice,
    previousPrice: actualPriceHistory[1]?.amount ?? null,
    compareAtPrice: actualCompareAtPrice ?? null,
    costPrice: actualCostPrice ?? null,
    margin,
    marginStatus,
    minAllowedPrice:
      minAllowedPrice ??
      (actualCostPrice ? Math.round(actualCostPrice * 1.1) : null),
    maxPrice,
    priceSource,
    priceHistory: actualPriceHistory,
    lastUpdatedAt,
    changesCount,
    targetMargin,
    syncStatus,
  };

  // Build variant options for header
  const variantOptions: IVariantOption[] | undefined = variantPrices?.map(
    (v) => ({
      id: v.variantId,
      title: v.variantTitle,
      price: v.currentPrice,
      margin: v.margin,
      hasWarning: v.margin !== null && v.margin < targetMargin,
    }),
  );

  return (
    <Paper css={cardStyles}>
      {/* Header */}
      <PricingHeader
        title={title}
        variants={variantOptions}
        selectedVariantId={selectedVariantId}
        onVariantSelect={handleVariantSelect}
        lastUpdatedAt={lastUpdatedAt}
        syncStatus={syncStatus}
        onEdit={onEdit}
        onMoreAction={onMoreAction}
      />

      {/* Two-column layout */}
      <Box css={twoColumnStyles}>
        <CurrentPriceColumn data={pricingData} formatPrice={formatPrice} />
        <PriceHistoryChart
          history={actualPriceHistory}
          formatPrice={formatPrice}
          changesCount={changesCount}
          onViewLog={onViewLog}
        />
      </Box>

      {/* KPI Row */}
      <KPIRow data={pricingData} formatPrice={formatPrice} />
    </Paper>
  );
};

// ============================================================================
// Export additional utilities
// ============================================================================

export { generateMockHistory, getMockVariantPrices };
export type {
  IPricingData,
  IVariantOption,
  PriceSource,
  TimeRange,
  MarginStatus,
  SyncStatus,
};
