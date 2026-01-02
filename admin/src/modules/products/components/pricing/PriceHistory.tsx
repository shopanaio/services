import { css } from '@emotion/react';
import {
  Typography,
  Popover,
  Timeline,
  Select,
  Flex,
  Tag,
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
  priceHistory: IPriceHistoryRecord[];
}

// ============================================================================
// Mock Data
// ============================================================================

export const generateMockHistory = (currentPrice: number): IPriceHistoryRecord[] => {
  const now = new Date();
  const history: IPriceHistoryRecord[] = [
    {
      id: '1',
      amount: currentPrice,
      compareAt: null,
      effectiveFrom: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      effectiveTo: null,
      isCurrent: true,
    },
    {
      id: '2',
      amount: Math.round(currentPrice * 1.15),
      compareAt: null,
      effectiveFrom: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      effectiveTo: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      isCurrent: false,
    },
    {
      id: '3',
      amount: Math.round(currentPrice * 0.9),
      compareAt: null,
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
      compareAt: null,
      effectiveFrom: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      effectiveTo: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      isCurrent: false,
    },
  ];
  return history;
};

export const getMockVariantPrices = (
  variants: Array<{ id: string; title: string; price: number }>,
): IVariantPriceSummary[] => {
  return variants.map((v) => {
    const history = generateMockHistory(v.price);
    return {
      variantId: v.id,
      variantTitle: v.title,
      currentPrice: v.price,
      previousPrice: history[1]?.amount || null,
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

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
  }).format(date);

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
            <Flex vertical gap="small">
              <Flex align="center" gap="2">
                <Typography.Text
                  strong={record.isCurrent}
                  css={css`
                    font-size: 13px;
                  `}
                >
                  {formatPrice(record.amount)}
                </Typography.Text>
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
                `}
              >
                {formatDateFull(record.effectiveFrom)}
                {record.effectiveTo && ` — ${formatDateFull(record.effectiveTo)}`}
              </Typography.Text>
            </Flex>
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
  history: IPriceHistoryRecord[];
}

export const PriceSummaryCard = ({ price, history }: IPriceSummaryCardProps) => {
  const previousPrice = history[1]?.amount || null;

  return (
    <Flex align="center" gap="3">
      <PriceHistoryPopover history={history}>
        <Flex
          align="center"
          gap="2"
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
              font-size: 20px;
            `}
          >
            {formatPrice(price)}
          </Typography.Text>
          <HistoryOutlined
            css={css`
              font-size: 12px;
              color: var(--color-gray-6);
            `}
          />
        </Flex>
      </PriceHistoryPopover>
      <PriceChangeIndicator
        currentPrice={price}
        previousPrice={previousPrice}
      />
      <div
        css={css`
          margin-left: 8px;
          padding-left: 12px;
          border-left: 1px solid var(--color-gray-3);
        `}
      >
        <PriceSparkline history={history} />
      </div>
      <div
        css={css`
          margin-left: auto;
          padding-left: 12px;
          border-left: 1px solid var(--color-gray-3);
        `}
      >
        <PriceStats history={history} />
      </div>
    </Flex>
  );
};
