import { css } from '@emotion/react';
import {
  Typography,
  Popover,
  Timeline,
  Select,
  Flex,
  Tag,
  Badge,
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface IPriceHistoryRecord {
  id: string;
  amount: number; // in minor units (kopecks)
  compareAt: number | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isCurrent: boolean;
}

export interface IVariantPriceSummary {
  variantId: string;
  variantTitle: string;
  currentPrice: number;
  previousPrice: number | null;
  compareAtPrice: number | null;
  costPrice: number | null;
  margin: number | null; // percentage
  priceHistory: IPriceHistoryRecord[];
}

// ============================================================================
// Mock Data
// ============================================================================

export const generateMockHistory = (
  currentPrice: number,
  currentCompareAt?: number | null,
): IPriceHistoryRecord[] => {
  const now = new Date();
  const history: IPriceHistoryRecord[] = [
    {
      id: '1',
      amount: currentPrice,
      compareAt: currentCompareAt || null,
      effectiveFrom: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      effectiveTo: null,
      isCurrent: true,
    },
    {
      id: '2',
      amount: Math.round(currentPrice * 1.15),
      compareAt: Math.round(currentPrice * 1.4),
      effectiveFrom: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      effectiveTo: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      isCurrent: false,
    },
    {
      id: '3',
      amount: Math.round(currentPrice * 0.9),
      compareAt: Math.round(currentPrice * 1.1),
      effectiveFrom: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
      effectiveTo: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      isCurrent: false,
    },
    {
      id: '4',
      amount: Math.round(currentPrice * 1.05),
      compareAt: null,
      effectiveFrom: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      effectiveTo: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
      isCurrent: false,
    },
    {
      id: '5',
      amount: Math.round(currentPrice * 1.2),
      compareAt: Math.round(currentPrice * 1.5),
      effectiveFrom: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      effectiveTo: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      isCurrent: false,
    },
  ];
  return history;
};

export const getMockVariantPrices = (
  variants: Array<{
    id: string;
    title: string;
    price: number;
    compareAtPrice?: number | null;
    costPrice?: number | null;
  }>,
): IVariantPriceSummary[] => {
  return variants.map((v) => {
    const history = generateMockHistory(v.price);
    const costPrice = v.costPrice ?? Math.round(v.price * 0.6); // mock: 60% of price
    const margin = costPrice > 0 ? Math.round(((v.price - costPrice) / v.price) * 100) : null;
    return {
      variantId: v.id,
      variantTitle: v.title,
      currentPrice: v.price,
      previousPrice: history[1]?.amount || null,
      compareAtPrice: v.compareAtPrice ?? (Math.random() > 0.5 ? Math.round(v.price * 1.2) : null),
      costPrice,
      margin,
      priceHistory: history,
    };
  });
};

// ============================================================================
// Utilities
// ============================================================================

const formatPrice = (amount: number) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount / 100);

const formatDateFull = (date: Date) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

// ============================================================================
// PriceChangeIndicator
// ============================================================================

interface IPriceChangeIndicatorProps {
  currentPrice: number;
  previousPrice: number | null;
  size?: 'small' | 'default';
}

export const PriceChangeIndicator = ({
  currentPrice,
  previousPrice,
  size = 'default',
}: IPriceChangeIndicatorProps) => {
  if (!previousPrice || previousPrice === currentPrice) {
    return null;
  }

  const diff = currentPrice - previousPrice;
  const percentChange = ((diff / previousPrice) * 100).toFixed(0);
  const isIncrease = diff > 0;

  return (
    <Tag
      color={isIncrease ? 'error' : 'success'}
      css={css`
        margin: 0;
        font-size: ${size === 'small' ? '10px' : '12px'};
        padding: ${size === 'small' ? '0 4px' : '0 6px'};
        line-height: ${size === 'small' ? '16px' : '20px'};
        border: none;
      `}
    >
      {isIncrease ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
      {' '}
      {isIncrease ? '+' : ''}
      {percentChange}%
    </Tag>
  );
};

// ============================================================================
// DiscountBadge
// ============================================================================

interface IDiscountBadgeProps {
  price: number;
  compareAtPrice: number;
  size?: 'small' | 'default';
  showSaving?: boolean;
}

export const DiscountBadge = ({
  price,
  compareAtPrice,
  size = 'default',
  showSaving = true,
}: IDiscountBadgeProps) => {
  if (!compareAtPrice || compareAtPrice <= price) {
    return null;
  }

  const saving = compareAtPrice - price;
  const discountPercent = Math.round((saving / compareAtPrice) * 100);

  return (
    <Flex align="center" gap="small">
      <Tag
        color="red"
        css={css`
          margin: 0;
          font-size: ${size === 'small' ? '10px' : '11px'};
          padding: ${size === 'small' ? '0 4px' : '0 6px'};
          line-height: ${size === 'small' ? '16px' : '18px'};
          font-weight: 600;
        `}
      >
        -{discountPercent}%
      </Tag>
      {showSaving && (
        <Typography.Text
          type="success"
          css={css`
            font-size: ${size === 'small' ? '10px' : '11px'};
          `}
        >
          Save {formatPrice(saving)}
        </Typography.Text>
      )}
    </Flex>
  );
};

// ============================================================================
// PriceSparkline
// ============================================================================

interface IPriceSparklineProps {
  history: IPriceHistoryRecord[];
  width?: number;
  height?: number;
}

export const PriceSparkline = ({
  history,
  width = 100,
  height = 32,
}: IPriceSparklineProps) => {
  if (history.length < 2) return null;

  const prices = [...history].reverse().map((h) => h.amount);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const padding = 4;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = prices.map((price, i) => {
    const x = padding + (i / (prices.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((price - min) / range) * chartHeight;
    return `${x},${y}`;
  });

  const isUp = prices[prices.length - 1] > prices[0];
  const strokeColor = isUp ? '#ff4d4f' : '#52c41a'; // red for up, green for down
  const fillColor = isUp ? 'rgba(255, 77, 79, 0.1)' : 'rgba(82, 196, 26, 0.1)';

  // Create area path for gradient fill
  const areaPath = `M ${points[0]} L ${points.join(' L ')} L ${padding + chartWidth},${padding + chartHeight} L ${padding},${padding + chartHeight} Z`;

  return (
    <svg
      width={width}
      height={height}
      css={css`
        display: block;
        background: var(--color-gray-1, #fafafa);
        border-radius: 4px;
      `}
    >
      {/* Area fill */}
      <path d={areaPath} fill={fillColor} />
      {/* Line */}
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current price dot */}
      <circle
        cx={points[points.length - 1].split(',')[0]}
        cy={points[points.length - 1].split(',')[1]}
        r="3"
        fill={strokeColor}
      />
      {/* Start price dot */}
      <circle
        cx={points[0].split(',')[0]}
        cy={points[0].split(',')[1]}
        r="2"
        fill={strokeColor}
        opacity="0.5"
      />
    </svg>
  );
};

// ============================================================================
// PriceStats
// ============================================================================

interface IPriceStatsProps {
  history: IPriceHistoryRecord[];
  showChangesCount?: boolean;
}

export const PriceStats = ({
  history,
  showChangesCount = true,
}: IPriceStatsProps) => {
  const prices = history.map((h) => h.amount);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

  return (
    <Flex
      gap="3"
      css={css`
        font-size: 11px;
      `}
    >
      <Flex vertical align="center">
        <Typography.Text
          type="secondary"
          css={css`
            font-size: 10px;
          `}
        >
          Min
        </Typography.Text>
        <Typography.Text
          css={css`
            font-size: 12px;
            color: var(--color-success);
          `}
        >
          {formatPrice(min)}
        </Typography.Text>
      </Flex>
      <Flex vertical align="center">
        <Typography.Text
          type="secondary"
          css={css`
            font-size: 10px;
          `}
        >
          Max
        </Typography.Text>
        <Typography.Text
          css={css`
            font-size: 12px;
            color: var(--color-error);
          `}
        >
          {formatPrice(max)}
        </Typography.Text>
      </Flex>
      <Flex vertical align="center">
        <Typography.Text
          type="secondary"
          css={css`
            font-size: 10px;
          `}
        >
          Avg
        </Typography.Text>
        <Typography.Text
          css={css`
            font-size: 12px;
          `}
        >
          {formatPrice(avg)}
        </Typography.Text>
      </Flex>
      {showChangesCount && (
        <Flex vertical align="center">
          <Typography.Text
            type="secondary"
            css={css`
              font-size: 10px;
            `}
          >
            Changes
          </Typography.Text>
          <Typography.Text
            css={css`
              font-size: 12px;
            `}
          >
            {history.length - 1}
          </Typography.Text>
        </Flex>
      )}
    </Flex>
  );
};

// ============================================================================
// PriceHistoryTimeline
// ============================================================================

interface IPriceHistoryTimelineProps {
  history: IPriceHistoryRecord[];
}

export const PriceHistoryTimeline = ({
  history,
}: IPriceHistoryTimelineProps) => {
  return (
    <Timeline
      css={css`
        padding: 12px 0 0 0;
        margin: 0;
        .ant-timeline-item {
          padding-bottom: 12px;
        }
        .ant-timeline-item:last-child {
          padding-bottom: 0;
        }
        .ant-timeline-item-tail {
          border-inline-start: 2px solid var(--color-gray-3);
        }
      `}
      items={history.map((record, idx) => {
        const prevRecord = history[idx + 1];
        const priceChange = prevRecord
          ? record.amount - prevRecord.amount
          : null;
        const isIncrease = priceChange !== null && priceChange > 0;
        const isDecrease = priceChange !== null && priceChange < 0;

        return {
          color: record.isCurrent
            ? 'blue'
            : isDecrease
              ? 'green'
              : isIncrease
                ? 'red'
                : 'gray',
          children: (
            <div>
              <Flex align="center" gap="small" wrap="wrap">
                <Typography.Text
                  strong={record.isCurrent}
                  css={css`
                    font-size: 13px;
                  `}
                >
                  {formatPrice(record.amount)}
                </Typography.Text>
                {record.compareAt && (
                  <>
                    <Typography.Text
                      delete
                      type="secondary"
                      css={css`
                        font-size: 11px;
                      `}
                    >
                      {formatPrice(record.compareAt)}
                    </Typography.Text>
                    <DiscountBadge
                      price={record.amount}
                      compareAtPrice={record.compareAt}
                      size="small"
                      showSaving={false}
                    />
                  </>
                )}
                {priceChange !== null && (
                  <PriceChangeIndicator
                    currentPrice={record.amount}
                    previousPrice={prevRecord.amount}
                    size="small"
                  />
                )}
                {record.isCurrent && (
                  <Tag
                    color="blue"
                    css={css`
                      margin: 0;
                      font-size: 10px;
                      line-height: 16px;
                      padding: 0 4px;
                    `}
                  >
                    current
                  </Tag>
                )}
              </Flex>
              <Typography.Text
                type="secondary"
                css={css`
                  font-size: 11px;
                  display: block;
                  margin-top: 4px;
                `}
              >
                {formatDateFull(record.effectiveFrom)}
                {record.effectiveTo && ` — ${formatDateFull(record.effectiveTo)}`}
              </Typography.Text>
            </div>
          ),
        };
      })}
    />
  );
};

// ============================================================================
// PriceHistoryPopover
// ============================================================================

interface IPriceHistoryPopoverProps {
  history: IPriceHistoryRecord[];
  children: ReactNode;
}

export const PriceHistoryPopover = ({
  history,
  children,
}: IPriceHistoryPopoverProps) => {
  const content = (
    <div
      css={css`
        min-width: 240px;
        max-width: 300px;
      `}
    >
      <Flex
        align="center"
        justify="space-between"
        css={css`
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--color-gray-3);
        `}
      >
        <Typography.Text
          strong
          css={css`
            font-size: 12px;
          `}
        >
          Price History
        </Typography.Text>
        <PriceStats history={history} showChangesCount={false} />
      </Flex>
      <PriceHistoryTimeline history={history} />
    </div>
  );

  return (
    <Popover content={content} trigger="hover" placement="bottom">
      {children}
    </Popover>
  );
};

// ============================================================================
// VariantPriceSelect
// ============================================================================

interface IVariantPriceSelectProps {
  variants: IVariantPriceSummary[];
  selectedVariantId?: string;
  onSelect?: (variantId: string) => void;
  size?: 'small' | 'default';
}

export const VariantPriceSelect = ({
  variants,
  selectedVariantId,
  onSelect,
  size = 'default',
}: IVariantPriceSelectProps) => {
  return (
    <Select
      value={selectedVariantId}
      onChange={onSelect}
      style={{ minWidth: size === 'small' ? 180 : 240 }}
      placeholder="Select variant"
      popupMatchSelectWidth={false}
      size={size === 'small' ? 'small' : 'middle'}
      css={css`
        .ant-select-selection-item {
          font-size: ${size === 'small' ? '12px' : '13px'};
        }
      `}
      labelRender={(props) => {
        const v = variants.find((v) => v.variantId === props.value);
        if (!v) return props.label;
        return (
          <Flex align="center" gap="2">
            <span>{v.variantTitle}</span>
            <Typography.Text
              type="secondary"
              css={css`font-size: 11px;`}
            >
              {formatPrice(v.currentPrice)}
            </Typography.Text>
          </Flex>
        );
      }}
      options={variants.map((v) => ({
        value: v.variantId,
        label: v.variantTitle,
      }))}
      optionRender={(option) => {
        const v = variants.find((vv) => vv.variantId === option.value);
        if (!v) return option.label;
        return (
          <Flex
            justify="space-between"
            align="center"
            gap="3"
            css={css`
              min-width: 280px;
              padding: 4px 0;
            `}
          >
            <Typography.Text
              css={css`
                font-size: 13px;
              `}
            >
              {v.variantTitle}
            </Typography.Text>
            <Flex align="center" gap="2">
              <Typography.Text
                strong
                css={css`
                  font-size: 13px;
                `}
              >
                {formatPrice(v.currentPrice)}
              </Typography.Text>
              <PriceChangeIndicator
                currentPrice={v.currentPrice}
                previousPrice={v.previousPrice}
                size="small"
              />
            </Flex>
          </Flex>
        );
      }}
    />
  );
};

// ============================================================================
// PriceSummaryCard (combines all elements for simple products)
// ============================================================================

interface IPriceSummaryCardProps {
  price: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  history: IPriceHistoryRecord[];
  formatPriceFn?: (amount: number) => string;
}

export const PriceSummaryCard = ({
  price,
  compareAtPrice,
  costPrice,
  history,
  formatPriceFn,
}: IPriceSummaryCardProps) => {
  const previousPrice = history[1]?.amount || null;
  const format = formatPriceFn || formatPrice;
  const margin = costPrice && costPrice > 0
    ? Math.round(((price - costPrice) / price) * 100)
    : null;
  const saving = compareAtPrice && compareAtPrice > price ? compareAtPrice - price : null;
  const discountPercent = saving && compareAtPrice ? Math.round((saving / compareAtPrice) * 100) : null;

  return (
    <Flex vertical gap="middle">
      {/* Main price row - 3 columns */}
      <Flex align="flex-start" gap="middle">
        {/* Column 1: vs last + Price */}
        <Flex vertical gap="small">
          {previousPrice && previousPrice !== price && (
            <PriceChangeIndicator
              currentPrice={price}
              previousPrice={previousPrice}
            />
          )}
          <PriceHistoryPopover history={history}>
            <Flex
              align="center"
              gap="small"
              css={css`
                cursor: pointer;
                &:hover {
                  opacity: 0.8;
                }
              `}
            >
              <Typography.Text
                strong
                css={css`
                  font-size: 24px;
                `}
              >
                {format(price)}
              </Typography.Text>
              <HistoryOutlined
                css={css`
                  font-size: 12px;
                  color: var(--color-gray-6);
                `}
              />
            </Flex>
          </PriceHistoryPopover>
        </Flex>

        {/* Column 2: Compare at price + discount/saving */}
        {compareAtPrice && compareAtPrice > 0 && (
          <Flex
            vertical
            gap="small"
            css={css`
              padding-left: 16px;
              border-left: 1px solid var(--color-gray-3);
            `}
          >
            <Typography.Text
              delete
              type="secondary"
              css={css`
                font-size: 14px;
              `}
            >
              {format(compareAtPrice)}
            </Typography.Text>
            <Flex align="center" gap="small">
              {discountPercent && (
                <Badge
                  count={`-${discountPercent}%`}
                  color="default"
                  css={css`
                    .ant-badge-count {
                      font-size: 11px;
                      font-weight: 600;
                      box-shadow: none;
                    }
                  `}
                />
              )}
              {saving && (
                <Typography.Text
                  type="success"
                  css={css`
                    font-size: 12px;
                  `}
                >
                  Save {format(saving)}
                </Typography.Text>
              )}
            </Flex>
          </Flex>
        )}

        {/* Column 3: Chart - grows to fill space */}
        <div
          css={css`
            flex: 1;
            padding-left: 16px;
            border-left: 1px solid var(--color-gray-3);
          `}
        >
          <PriceSparkline history={history} width={200} height={56} />
        </div>
      </Flex>

      {/* Cost, Margin & Stats row */}
      <Flex
        align="center"
        justify="space-between"
        css={css`
          padding-top: 12px;
          border-top: 1px solid var(--color-gray-3);
        `}
      >
        <Flex gap="middle">
          {costPrice && costPrice > 0 && (
            <Flex vertical align="center">
              <Typography.Text
                type="secondary"
                css={css`
                  font-size: 10px;
                `}
              >
                Cost
              </Typography.Text>
              <Typography.Text
                css={css`
                  font-size: 12px;
                `}
              >
                {format(costPrice)}
              </Typography.Text>
            </Flex>
          )}
          {margin !== null && (
            <Flex vertical align="center">
              <Typography.Text
                type="secondary"
                css={css`
                  font-size: 10px;
                `}
              >
                Margin
              </Typography.Text>
              <Typography.Text
                css={css`
                  font-size: 12px;
                  color: ${margin >= 30
                    ? '#52c41a'
                    : margin >= 15
                      ? '#faad14'
                      : '#ff4d4f'};
                `}
              >
                {margin}%
              </Typography.Text>
            </Flex>
          )}
        </Flex>
        <div
          css={css`
            padding-left: 12px;
            border-left: 1px solid var(--color-gray-3);
          `}
        >
          <PriceStats history={history} />
        </div>
      </Flex>
    </Flex>
  );
};
