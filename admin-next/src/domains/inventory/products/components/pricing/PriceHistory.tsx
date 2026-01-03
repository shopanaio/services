import { createStyles } from "antd-style";
import { Typography, Popover, Timeline, Select, Flex, Tag, Badge } from "antd";
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { ReactNode } from "react";

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
  currentCompareAt?: number | null
): IPriceHistoryRecord[] => {
  const now = new Date();
  const history: IPriceHistoryRecord[] = [
    {
      id: "1",
      amount: currentPrice,
      compareAt: currentCompareAt || null,
      effectiveFrom: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      effectiveTo: null,
      isCurrent: true,
    },
    {
      id: "2",
      amount: Math.round(currentPrice * 1.15),
      compareAt: Math.round(currentPrice * 1.4),
      effectiveFrom: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      effectiveTo: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      isCurrent: false,
    },
    {
      id: "3",
      amount: Math.round(currentPrice * 0.9),
      compareAt: Math.round(currentPrice * 1.1),
      effectiveFrom: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
      effectiveTo: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      isCurrent: false,
    },
    {
      id: "4",
      amount: Math.round(currentPrice * 1.05),
      compareAt: null,
      effectiveFrom: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      effectiveTo: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
      isCurrent: false,
    },
    {
      id: "5",
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
  }>
): IVariantPriceSummary[] => {
  return variants.map((v) => {
    const history = generateMockHistory(v.price);
    const costPrice = v.costPrice ?? Math.round(v.price * 0.6);
    const margin =
      costPrice > 0
        ? Math.round(((v.price - costPrice) / v.price) * 100)
        : null;
    return {
      variantId: v.id,
      variantTitle: v.title,
      currentPrice: v.price,
      previousPrice: history[1]?.amount || null,
      compareAtPrice:
        v.compareAtPrice ??
        (Math.random() > 0.5 ? Math.round(v.price * 1.2) : null),
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
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount / 100);

const formatDateFull = (date: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

// ============================================================================
// Styles
// ============================================================================

const usePriceChangeStyles = createStyles(({ token }) => ({
  tagSmall: {
    margin: 0,
    fontSize: 10,
    padding: "0 4px",
    lineHeight: "16px",
    border: "none",
  },
  tagDefault: {
    margin: 0,
    fontSize: 12,
    padding: "0 6px",
    lineHeight: "20px",
    border: "none",
  },
}));

const useDiscountStyles = createStyles(({ token }) => ({
  tagSmall: {
    margin: 0,
    fontSize: 10,
    padding: "0 4px",
    lineHeight: "16px",
    fontWeight: 600,
  },
  tagDefault: {
    margin: 0,
    fontSize: 11,
    padding: "0 6px",
    lineHeight: "18px",
    fontWeight: 600,
  },
  savingSmall: {
    fontSize: 10,
  },
  savingDefault: {
    fontSize: 11,
  },
}));

const useSparklineStyles = createStyles(({ token }) => ({
  svg: {
    display: "block",
    background: token.colorBgLayout,
    borderRadius: 4,
  },
}));

const useStatsStyles = createStyles(({ token }) => ({
  container: {
    fontSize: 11,
  },
  containerStretched: {
    fontSize: 11,
    width: "100%",
  },
  labelText: {
    fontSize: 10,
  },
  valueText: {
    fontSize: 12,
  },
  minValue: {
    fontSize: 12,
    color: token.colorSuccess,
  },
  maxValue: {
    fontSize: 12,
    color: token.colorError,
  },
}));

const useTimelineStyles = createStyles(({ token }) => ({
  timeline: {
    padding: "12px 0 0 0",
    margin: 0,
    ".ant-timeline-item": {
      paddingBottom: 12,
    },
    ".ant-timeline-item:last-child": {
      paddingBottom: 0,
    },
    ".ant-timeline-item-tail": {
      borderInlineStart: `2px solid ${token.colorBorderSecondary}`,
    },
  },
  priceText: {
    fontSize: 13,
  },
  compareText: {
    fontSize: 11,
  },
  currentTag: {
    margin: 0,
    fontSize: 10,
    lineHeight: "16px",
    padding: "0 4px",
  },
  dateText: {
    fontSize: 11,
    display: "block",
    marginTop: 4,
  },
}));

const usePopoverStyles = createStyles(({ token }) => ({
  content: {
    minWidth: 240,
    maxWidth: 300,
  },
  header: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  title: {
    fontSize: 12,
  },
}));

const useSelectStyles = createStyles(({ token }) => ({
  selectSmall: {
    ".ant-select-selection-item": {
      fontSize: 12,
    },
  },
  selectDefault: {
    ".ant-select-selection-item": {
      fontSize: 13,
    },
  },
  labelPrice: {
    fontSize: 11,
  },
  optionContainer: {
    minWidth: 280,
    padding: "4px 0",
  },
  optionTitle: {
    fontSize: 13,
  },
  optionPrice: {
    fontSize: 13,
  },
}));

const useSummaryStyles = createStyles(({ token }) => ({
  priceContainer: {
    cursor: "pointer",
    "&:hover": {
      opacity: 0.8,
    },
  },
  mainPrice: {
    fontSize: 24,
  },
  historyIcon: {
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  compareSection: {
    paddingLeft: 16,
    borderLeft: `1px solid ${token.colorBorderSecondary}`,
  },
  comparePrice: {
    fontSize: 14,
  },
  savingText: {
    fontSize: 12,
  },
  chartSection: {
    flex: 1,
    paddingLeft: 16,
    borderLeft: `1px solid ${token.colorBorderSecondary}`,
  },
  statsSection: {
    paddingTop: 12,
    borderTop: `1px solid ${token.colorBorderSecondary}`,
  },
  labelText: {
    fontSize: 10,
  },
  valueText: {
    fontSize: 12,
  },
  statsRight: {
    flex: 1,
    marginLeft: 16,
    paddingLeft: 16,
    borderLeft: `1px solid ${token.colorBorderSecondary}`,
  },
}));

// ============================================================================
// PriceChangeIndicator
// ============================================================================

interface IPriceChangeIndicatorProps {
  currentPrice: number;
  previousPrice: number | null;
  size?: "small" | "default";
}

export const PriceChangeIndicator = ({
  currentPrice,
  previousPrice,
  size = "default",
}: IPriceChangeIndicatorProps) => {
  const { styles } = usePriceChangeStyles();

  if (!previousPrice || previousPrice === currentPrice) {
    return null;
  }

  const diff = currentPrice - previousPrice;
  const percentChange = ((diff / previousPrice) * 100).toFixed(0);
  const isIncrease = diff > 0;

  return (
    <Tag
      color={isIncrease ? "error" : "success"}
      className={size === "small" ? styles.tagSmall : styles.tagDefault}
      variant="outlined"
    >
      {isIncrease ? <ArrowUpOutlined /> : <ArrowDownOutlined />}{" "}
      {isIncrease ? "+" : ""}
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
  size?: "small" | "default";
  showSaving?: boolean;
}

export const DiscountBadge = ({
  price,
  compareAtPrice,
  size = "default",
  showSaving = true,
}: IDiscountBadgeProps) => {
  const { styles } = useDiscountStyles();

  if (!compareAtPrice || compareAtPrice <= price) {
    return null;
  }

  const saving = compareAtPrice - price;
  const discountPercent = Math.round((saving / compareAtPrice) * 100);

  return (
    <Flex align="center" gap="small">
      <Tag
        color="red"
        className={size === "small" ? styles.tagSmall : styles.tagDefault}
        variant="outlined"
      >
        -{discountPercent}%
      </Tag>
      {showSaving && (
        <Typography.Text
          type="success"
          className={
            size === "small" ? styles.savingSmall : styles.savingDefault
          }
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
  const { styles } = useSparklineStyles();

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
  const strokeColor = isUp ? "#ff4d4f" : "#52c41a";
  const fillColor = isUp ? "rgba(255, 77, 79, 0.1)" : "rgba(82, 196, 26, 0.1)";

  const areaPath = `M ${points[0]} L ${points.join(" L ")} L ${
    padding + chartWidth
  },${padding + chartHeight} L ${padding},${padding + chartHeight} Z`;

  return (
    <svg width={width} height={height} className={styles.svg}>
      <path d={areaPath} fill={fillColor} />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={points[points.length - 1].split(",")[0]}
        cy={points[points.length - 1].split(",")[1]}
        r="3"
        fill={strokeColor}
      />
      <circle
        cx={points[0].split(",")[0]}
        cy={points[0].split(",")[1]}
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
  stretched?: boolean;
}

export const PriceStats = ({
  history,
  showChangesCount = true,
  stretched = false,
}: IPriceStatsProps) => {
  const { styles } = useStatsStyles();

  const prices = history.map((h) => h.amount);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

  return (
    <Flex
      gap={12}
      justify={stretched ? "space-between" : undefined}
      className={stretched ? styles.containerStretched : styles.container}
    >
      <Flex vertical align="center">
        <Typography.Text type="secondary" className={styles.labelText}>
          Min
        </Typography.Text>
        <Typography.Text className={styles.minValue}>
          {formatPrice(min)}
        </Typography.Text>
      </Flex>
      <Flex vertical align="center">
        <Typography.Text type="secondary" className={styles.labelText}>
          Max
        </Typography.Text>
        <Typography.Text className={styles.maxValue}>
          {formatPrice(max)}
        </Typography.Text>
      </Flex>
      <Flex vertical align="center">
        <Typography.Text type="secondary" className={styles.labelText}>
          Avg
        </Typography.Text>
        <Typography.Text className={styles.valueText}>
          {formatPrice(avg)}
        </Typography.Text>
      </Flex>
      {showChangesCount && (
        <Flex vertical align="center">
          <Typography.Text type="secondary" className={styles.labelText}>
            Changes
          </Typography.Text>
          <Typography.Text className={styles.valueText}>
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
  const { styles } = useTimelineStyles();

  return (
    <Timeline
      className={styles.timeline}
      items={history.map((record, idx) => {
        const prevRecord = history[idx + 1];
        const priceChange = prevRecord
          ? record.amount - prevRecord.amount
          : null;
        const isIncrease = priceChange !== null && priceChange > 0;
        const isDecrease = priceChange !== null && priceChange < 0;

        return {
          color: record.isCurrent
            ? "blue"
            : isDecrease
            ? "green"
            : isIncrease
            ? "red"
            : "gray",
          children: (
            <div>
              <Flex align="center" gap="small" wrap="wrap">
                <Typography.Text
                  strong={record.isCurrent}
                  className={styles.priceText}
                >
                  {formatPrice(record.amount)}
                </Typography.Text>
                {record.compareAt && (
                  <>
                    <Typography.Text
                      delete
                      type="secondary"
                      className={styles.compareText}
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
                    className={styles.currentTag}
                    variant="outlined"
                  >
                    current
                  </Tag>
                )}
              </Flex>
              <Typography.Text type="secondary" className={styles.dateText}>
                {formatDateFull(record.effectiveFrom)}
                {record.effectiveTo &&
                  ` — ${formatDateFull(record.effectiveTo)}`}
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
  const { styles } = usePopoverStyles();

  const content = (
    <div className={styles.content}>
      <Flex align="center" justify="space-between" className={styles.header}>
        <Typography.Text strong className={styles.title}>
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
  size?: "small" | "default";
}

export const VariantPriceSelect = ({
  variants,
  selectedVariantId,
  onSelect,
  size = "default",
}: IVariantPriceSelectProps) => {
  const { styles } = useSelectStyles();

  return (
    <Select
      value={selectedVariantId}
      onChange={onSelect}
      style={{ minWidth: size === "small" ? 180 : 240 }}
      placeholder="Select variant"
      popupMatchSelectWidth={false}
      size={size === "small" ? "small" : "middle"}
      className={size === "small" ? styles.selectSmall : styles.selectDefault}
      labelRender={(props) => {
        const v = variants.find((v) => v.variantId === props.value);
        if (!v) return props.label;
        return (
          <Flex align="center" gap={8}>
            <span>{v.variantTitle}</span>
            <Typography.Text type="secondary" className={styles.labelPrice}>
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
            gap={12}
            className={styles.optionContainer}
          >
            <Typography.Text className={styles.optionTitle}>
              {v.variantTitle}
            </Typography.Text>
            <Flex align="center" gap={8}>
              <Typography.Text strong className={styles.optionPrice}>
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
// PriceSummaryCard
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
  const { styles } = useSummaryStyles();

  const previousPrice = history[1]?.amount || null;
  const format = formatPriceFn || formatPrice;
  const margin =
    costPrice && costPrice > 0
      ? Math.round(((price - costPrice) / price) * 100)
      : null;
  const saving =
    compareAtPrice && compareAtPrice > price ? compareAtPrice - price : null;
  const discountPercent =
    saving && compareAtPrice
      ? Math.round((saving / compareAtPrice) * 100)
      : null;

  const marginColor =
    margin !== null
      ? margin >= 30
        ? "#52c41a"
        : margin >= 15
        ? "#faad14"
        : "#ff4d4f"
      : undefined;

  return (
    <Flex vertical gap="middle">
      <Flex align="flex-start" gap="middle">
        <Flex vertical gap="small">
          {previousPrice && previousPrice !== price && (
            <PriceChangeIndicator
              currentPrice={price}
              previousPrice={previousPrice}
            />
          )}
          <PriceHistoryPopover history={history}>
            <Flex align="center" gap="small" className={styles.priceContainer}>
              <Typography.Text strong className={styles.mainPrice}>
                {format(price)}
              </Typography.Text>
              <HistoryOutlined className={styles.historyIcon} />
            </Flex>
          </PriceHistoryPopover>
        </Flex>

        {compareAtPrice && compareAtPrice > 0 && (
          <Flex vertical gap="small" className={styles.compareSection}>
            <Typography.Text
              delete
              type="secondary"
              className={styles.comparePrice}
            >
              {format(compareAtPrice)}
            </Typography.Text>
            <Flex align="center" gap="small">
              {discountPercent && (
                <Badge count={`-${discountPercent}%`} color="default" />
              )}
              {saving && (
                <Typography.Text type="success" className={styles.savingText}>
                  Save {format(saving)}
                </Typography.Text>
              )}
            </Flex>
          </Flex>
        )}

        <div className={styles.chartSection}>
          <PriceSparkline history={history} width={200} height={56} />
        </div>
      </Flex>

      <Flex align="center" className={styles.statsSection}>
        <Flex gap="middle">
          {costPrice && costPrice > 0 && (
            <Flex vertical align="center">
              <Typography.Text type="secondary" className={styles.labelText}>
                Cost
              </Typography.Text>
              <Typography.Text className={styles.valueText}>
                {format(costPrice)}
              </Typography.Text>
            </Flex>
          )}
          {margin !== null && (
            <Flex vertical align="center">
              <Typography.Text type="secondary" className={styles.labelText}>
                Margin
              </Typography.Text>
              <Typography.Text style={{ fontSize: 12, color: marginColor }}>
                {margin}%
              </Typography.Text>
            </Flex>
          )}
        </Flex>
        <div className={styles.statsRight}>
          <PriceStats history={history} stretched />
        </div>
      </Flex>
    </Flex>
  );
};
