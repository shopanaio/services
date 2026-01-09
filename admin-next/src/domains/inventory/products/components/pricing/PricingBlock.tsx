import { createStyles } from "antd-style";
import { Typography, Button, Select, Tag, Tooltip, Dropdown, Flex } from "antd";
import { MoreOutlined, WarningOutlined } from "@ant-design/icons";
import { useState, useMemo, useCallback } from "react";
import { Paper } from "../Paper";
import { PaperHeader } from "../PaperHeader";
import { Tile } from "../Tile";
import { PeriodSwitch, CHART_PERIODS, ChartPeriod } from "../PeriodSwitch";
import {
  IPriceHistoryRecord,
  generateMockHistory,
  generateMockScheduledPrices,
  getMockVariantPrices,
} from "./PriceHistory";
import {
  useProductPriceHistoryModal,
  useEditVariantsModal,
} from "../../modals";

// ============================================================================
// Types
// ============================================================================

type PriceSource = "manual" | "rule-based" | "promo" | "market";
type MarginStatus = "ok" | "warning" | "critical";

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
}

interface IVariantOption {
  id: string;
  title: string;
  price: number;
  margin: number | null;
  hasWarning: boolean;
}

// Non-breaking space for currency formatting
const NBSP = "\u00A0";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  card: {
    padding: 16,
    minHeight: "auto",
  },
  headerSelect: {
    minWidth: 160,
    ".ant-select-selector": {
      fontSize: "12px !important",
    },
  },
  twoColumn: {
    display: "flex",
    gap: 8,
    alignItems: "stretch",
    marginBottom: 8,
    "@media (max-width: 768px)": {
      flexDirection: "column",
    },
  },
  priceColumnWrapper: {
    flex: 1,
    minWidth: 0,
    display: "flex",
  },
  chartColumnWrapper: {
    flex: 1.5,
    minWidth: 0,
    display: "flex",
  },
  column: {
    padding: 12,
    background: token.colorBgContainer,
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    flex: 1,
    width: "100%",
  },
  sectionLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    display: "block",
    marginBottom: 8,
    color: token.colorTextSecondary,
    fontWeight: 500,
  },
  mainPrice: {
    "&&": {
      fontSize: 32,
      fontWeight: 700,
      margin: 0,
      lineHeight: 1.2,
      whiteSpace: "nowrap",
    },
  },
  discountTag: {
    margin: 0,
    fontSize: 11,
    fontWeight: 600,
    background: token.colorBgContainerDisabled,
    color: token.colorText,
  },
  sourceTag: {
    margin: 0,
    fontSize: 10,
    background: "transparent",
    color: token.colorTextSecondary,
    cursor: "help",
  },
  marginWarningTag: {
    margin: 0,
    fontSize: 10,
    lineHeight: "16px",
    cursor: "help",
  },
  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 8,
    "@media (max-width: 1024px)": {
      gridTemplateColumns: "repeat(3, 1fr)",
    },
    "@media (max-width: 600px)": {
      gridTemplateColumns: "repeat(2, 1fr)",
    },
  },
  kpiTile: {
    textAlign: "center",
    minHeight: 56,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  warningIcon: {
    color: token.colorWarning,
    fontSize: 10,
  },
  chartSvg: {
    display: "block",
    width: "100%",
    height: 100,
    cursor: "crosshair",
  },
}));

// ============================================================================
// Helper Functions
// ============================================================================

const formatShortDate = (date: Date): string => {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  }).format(date);
};

const getMarginStatus = (
  margin: number | null,
  target: number = 35
): MarginStatus => {
  if (margin === null) return "warning";
  if (margin < target - 10) return "critical";
  if (margin < target) return "warning";
  return "ok";
};

const getPriceSourceLabel = (source: PriceSource): string => {
  switch (source) {
    case "manual":
      return "Manual";
    case "rule-based":
      return "Rule-based";
    case "promo":
      return "Promo";
    case "market":
      return "Market";
  }
};

// ============================================================================
// Sub-components
// ============================================================================

interface IPricingHeaderProps {
  title: string;
  variants?: IVariantOption[];
  selectedVariantId?: string;
  onVariantSelect?: (id: string) => void;
  onMoreAction?: (action: string) => void;
  formatPrice?: (amount: number) => string;
}

const PricingHeader = ({
  title,
  variants,
  selectedVariantId,
  onVariantSelect,
  onMoreAction,
  formatPrice,
}: IPricingHeaderProps) => {
  const { styles } = useStyles();
  const selectedVariant = variants?.find((v) => v.id === selectedVariantId);

  const moreMenuItems = [
    { key: "edit", label: "Edit" },
    { key: "history", label: "View history" },
  ];

  const variantSelect =
    variants && variants.length > 1 ? (
      <Select
        value={selectedVariantId}
        onChange={onVariantSelect}
        size="small"
        popupMatchSelectWidth={false}
        className={styles.headerSelect}
        labelRender={() => (
          <Flex align="center" gap={4}>
            <span>{selectedVariant?.title || "Select variant"}</span>
            {selectedVariant?.hasWarning && (
              <WarningOutlined className={styles.warningIcon} />
            )}
          </Flex>
        )}
        options={variants.map((v) => ({
          value: v.id,
          label: (
            <Flex
              justify="space-between"
              align="center"
              style={{ width: "100%" }}
            >
              <span>{v.title}</span>
              <Flex align="center" gap={8}>
                {v.hasWarning && (
                  <WarningOutlined className={styles.warningIcon} />
                )}
                <Typography.Text style={{ fontWeight: 600, marginLeft: 24 }}>
                  {formatPrice ? formatPrice(v.price) : v.price}
                </Typography.Text>
              </Flex>
            </Flex>
          ),
        }))}
      />
    ) : undefined;

  const actionsDropdown = onMoreAction ? (
    <Dropdown
      menu={{
        items: moreMenuItems,
        onClick: ({ key }) => onMoreAction(key),
      }}
      trigger={["click"]}
    >
      <Button size="small" icon={<MoreOutlined />} />
    </Dropdown>
  ) : undefined;

  return (
    <PaperHeader
      title={title}
      extra={variantSelect}
      actions={actionsDropdown}
    />
  );
};

interface ICurrentPriceColumnProps {
  data: IPricingData;
  formatPrice: (amount: number) => string;
}

const CurrentPriceColumn = ({
  data,
  formatPrice,
}: ICurrentPriceColumnProps) => {
  const { styles } = useStyles();
  const {
    currentPrice,
    compareAtPrice,
    priceSource,
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
    <div className={styles.column}>
      <Typography.Text className={styles.sectionLabel}>
        Current price
      </Typography.Text>

      <Typography.Title level={2} className={styles.mainPrice}>
        {formatPrice(currentPrice)}
      </Typography.Title>

      <Flex align="center" gap={8} style={{ marginTop: 8 }}>
        {discountPercent && (
          <Tag className={styles.discountTag} variant="outlined">
            -{discountPercent}%
          </Tag>
        )}
        <Tooltip
          title={
            priceSource === "manual"
              ? "Price set manually by user"
              : priceSource === "rule-based"
              ? "Price calculated by pricing rule"
              : priceSource === "promo"
              ? "Promotional price active"
              : "Market-based pricing"
          }
        >
          <Tag className={styles.sourceTag} variant="outlined">
            {getPriceSourceLabel(priceSource)}
          </Tag>
        </Tooltip>
      </Flex>

      {compareAtPrice && compareAtPrice > currentPrice && (
        <Flex align="center" gap={12} style={{ marginTop: 12, fontSize: 13 }}>
          <Typography.Text type="secondary">
            Was:{NBSP}
            <Typography.Text delete type="secondary">
              {formatPrice(compareAtPrice)}
            </Typography.Text>
          </Typography.Text>
          {saving && (
            <Typography.Text type="secondary">
              Save{NBSP}
              {formatPrice(saving)}
            </Typography.Text>
          )}
        </Flex>
      )}

      <Flex align="center" gap={8} style={{ marginTop: 12 }}>
        {marginStatus === "warning" && (
          <Tooltip title={`Below target margin (${targetMargin}%)`}>
            <Tag
              color="warning"
              className={styles.marginWarningTag}
              variant="outlined"
            >
              <WarningOutlined /> Below target
            </Tag>
          </Tooltip>
        )}

        {marginStatus === "critical" && (
          <Tooltip
            title={`Critical: margin significantly below target (${targetMargin}%)`}
          >
            <Tag
              color="error"
              className={styles.marginWarningTag}
              variant="outlined"
            >
              <WarningOutlined /> Below min margin
            </Tag>
          </Tooltip>
        )}
      </Flex>
    </div>
  );
};

interface IPriceHistoryChartProps {
  history: IPriceHistoryRecord[];
  formatPrice: (amount: number) => string;
  changesCount: number;
  onViewLog?: () => void;
}

const PriceHistoryChart = ({
  history,
  formatPrice,
}: IPriceHistoryChartProps) => {
  const { styles, theme } = useStyles();
  const [timeRange, setTimeRange] = useState<ChartPeriod>("30D");
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    price: number;
    date: Date;
    isMin?: boolean;
    isMax?: boolean;
    isCurrent?: boolean;
  } | null>(null);

  const filteredHistory = useMemo(() => {
    const now = new Date();
    const days = timeRange === "7D" ? 7 : timeRange === "30D" ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return history.filter((h) => h.effectiveFrom >= cutoff);
  }, [history, timeRange]);

  const prices = useMemo(
    () => [...filteredHistory].reverse().map((h) => h.amount),
    [filteredHistory]
  );
  const min = prices.length > 0 ? Math.min(...prices) : 0;
  const max = prices.length > 0 ? Math.max(...prices) : 0;

  const width = 400;
  const height = 100;
  const padding = { top: 12, right: 12, bottom: 12, left: 12 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

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
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`)
    .join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x},${
          padding.top + chartHeight
        } L ${points[0].x},${padding.top + chartHeight} Z`
      : "";

  const gridLines = [0, 0.5, 1].map((ratio) => ({
    y: padding.top + chartHeight * (1 - ratio),
    value: min + range * ratio,
  }));

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (points.length < 2) return;

      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;

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
    [points]
  );

  const currentPoint = points.find((p) => p.isCurrent);

  return (
    <div className={styles.column}>
      <Flex align="center" justify="space-between" style={{ marginBottom: 8 }}>
        <Typography.Text
          className={styles.sectionLabel}
          style={{ marginBottom: 0 }}
        >
          Price history
        </Typography.Text>

        <PeriodSwitch
          periods={CHART_PERIODS}
          value={timeRange}
          onChange={setTimeRange}
        />
      </Flex>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className={styles.chartSvg}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPoint(null)}
      >
        {gridLines.map((line, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={line.y}
              x2={width - padding.right}
              y2={line.y}
              stroke={theme.colorBorderSecondary}
              strokeDasharray="2,2"
            />
          </g>
        ))}

        {areaPath && <path d={areaPath} fill="rgba(22, 119, 255, 0.08)" />}

        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={theme.colorPrimary}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {points.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={hoveredPoint === point ? 4 : 2}
            fill={hoveredPoint === point ? theme.colorPrimary : "white"}
            stroke={theme.colorPrimary}
            strokeWidth="1.5"
          />
        ))}

        {currentPoint && currentPoint !== hoveredPoint && (
          <circle
            cx={currentPoint.x}
            cy={currentPoint.y}
            r="4"
            fill={theme.colorPrimary}
            stroke="white"
            strokeWidth="2"
          />
        )}

        {hoveredPoint && (
          <g>
            <rect
              x={Math.min(Math.max(hoveredPoint.x - 45, 5), width - 95)}
              y={Math.max(hoveredPoint.y - 36, 5)}
              width={90}
              height={30}
              rx={4}
              fill={theme.colorTextBase}
            />
            <text
              x={Math.min(Math.max(hoveredPoint.x, 50), width - 50)}
              y={Math.max(hoveredPoint.y - 22, 18)}
              textAnchor="middle"
              fill="white"
              fontSize="11"
              fontWeight="600"
            >
              {formatPrice(hoveredPoint.price)}
            </text>
            <text
              x={Math.min(Math.max(hoveredPoint.x, 50), width - 50)}
              y={Math.max(hoveredPoint.y - 10, 30)}
              textAnchor="middle"
              fill="rgba(255,255,255,0.7)"
              fontSize="9"
            >
              {formatShortDate(hoveredPoint.date)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

interface IKPIRowProps {
  data: IPricingData;
  formatPrice: (amount: number) => string;
}

const KPIRow = ({ data, formatPrice }: IKPIRowProps) => {
  const { styles, theme } = useStyles();
  const {
    costPrice,
    margin,
    marginStatus,
    minAllowedPrice,
    maxPrice,
    priceHistory,
  } = data;

  const prices = priceHistory.map((h) => h.amount);
  const avg30d =
    prices.length > 0
      ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      : null;

  return (
    <div className={styles.kpiRow}>
      <Tile
        label="Cost"
        value={costPrice ? formatPrice(costPrice) : "—"}
        tooltip={costPrice ? "Product cost price" : "Cost data missing"}
        centered
        className={styles.kpiTile}
      />
      <Tile
        label="Margin"
        value={margin !== null ? `${margin}%` : "—"}
        tooltip="Profit margin percentage"
        centered
        className={styles.kpiTile}
      />
      <Tile
        label="Min allowed"
        value={minAllowedPrice ? formatPrice(minAllowedPrice) : "—"}
        tooltip="Minimum price allowed by pricing policy"
        centered
        className={styles.kpiTile}
      />
      <Tile
        label="Max"
        value={maxPrice ? formatPrice(maxPrice) : "—"}
        tooltip="Maximum historical price"
        centered
        className={styles.kpiTile}
      />
      <Tile
        label="Avg 30D"
        value={avg30d ? formatPrice(avg30d) : "—"}
        tooltip="Average price over last 30 days"
        centered
        className={styles.kpiTile}
      />
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

interface IPricingBlockProps {
  price: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  priceHistory?: IPriceHistoryRecord[];
  variants?: Array<{
    id: string;
    title: string;
    price: number;
    compareAtPrice?: number | null;
    costPrice?: number | null;
    options?: Array<{
      title: string;
      group: {
        slug: string;
        title: string;
      };
    }>;
  }>;
  selectedVariantId?: string;
  onVariantSelect?: (id: string) => void;
  title?: string;
  priceSource?: PriceSource;
  minAllowedPrice?: number | null;
  targetMargin?: number;
  onEdit?: () => void;
  onViewLog?: () => void;
  onMoreAction?: (action: string) => void;
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
  title = "Pricing",
  priceSource = "manual",
  minAllowedPrice,
  targetMargin = 35,
  onViewLog,
  onMoreAction,
  formatPrice: formatPriceProp,
}: IPricingBlockProps) => {
  const { styles } = useStyles();
  const { push: pushPriceHistoryModal } = useProductPriceHistoryModal();
  const { push: pushEditVariantsModal } = useEditVariantsModal();

  const [internalSelectedVariantId, setInternalSelectedVariantId] = useState<
    string | undefined
  >(variants?.[0]?.id);
  const selectedVariantId = selectedVariantIdProp ?? internalSelectedVariantId;

  const handleVariantSelect = (id: string) => {
    setInternalSelectedVariantId(id);
    onVariantSelect?.(id);
  };

  const formatPrice =
    formatPriceProp ||
    ((amount: number) => {
      const formatted = new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "RUB",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount / 100);
      return formatted.replace(/\s+/g, NBSP);
    });

  const variantPrices = useMemo(() => {
    if (!variants?.length) return null;
    return getMockVariantPrices(variants);
  }, [variants]);

  const selectedVariantData = variantPrices?.find(
    (v) => v.variantId === selectedVariantId
  );

  const actualPrice = selectedVariantData?.currentPrice ?? price;
  const actualCompareAtPrice =
    selectedVariantData?.compareAtPrice ?? compareAtPrice;
  const actualCostPrice = selectedVariantData?.costPrice ?? costPrice;
  const actualPriceHistory =
    selectedVariantData?.priceHistory ??
    priceHistoryProp ??
    generateMockHistory(price, compareAtPrice);

  const actualScheduledPrices = useMemo(
    () => generateMockScheduledPrices(actualPrice),
    [actualPrice]
  );

  const margin =
    actualCostPrice && actualCostPrice > 0
      ? Math.round(((actualPrice - actualCostPrice) / actualPrice) * 100)
      : null;
  const marginStatus = getMarginStatus(margin, targetMargin);

  const maxPrice = Math.max(...actualPriceHistory.map((h) => h.amount));
  const changesCount = actualPriceHistory.length - 1;

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
    lastUpdatedAt: new Date(),
    changesCount,
    targetMargin,
  };

  const variantOptions: IVariantOption[] | undefined = variantPrices?.map(
    (v) => ({
      id: v.variantId,
      title: v.variantTitle,
      price: v.currentPrice,
      margin: v.margin,
      hasWarning: v.margin !== null && v.margin < targetMargin,
    })
  );

  const handleMoreAction = useCallback(
    (action: string) => {
      if (action === "edit") {
        pushEditVariantsModal({
          initialTab: "pricing",
          variants: variantPrices?.map((v) => {
            const originalVariant = variants?.find(
              (vv) => vv.id === v.variantId
            );
            return {
              id: v.variantId,
              title: v.variantTitle,
              price: v.currentPrice,
              compareAtPrice: v.compareAtPrice,
              costPrice: v.costPrice,
              options: originalVariant?.options,
            };
          }) || [
            {
              id: "default",
              title: "Default",
              price: actualPrice,
              compareAtPrice: actualCompareAtPrice,
              costPrice: actualCostPrice,
            },
          ],
          formatPrice: formatPriceProp,
          // Pricing-only mode: show only price columns, no settings button
          availableColumns: ["price", "compareAtPrice", "costPrice"],
          showColumnSettings: false,
          onSave: (
            updatedVariants: Array<{
              id: string;
              sku: string | null;
              stock: number;
              barcode: string | null;
              price: number;
              compareAtPrice: number | null;
              costPrice: number | null;
              weight: number | null;
              weightUnit: string;
              length: number | null;
              width: number | null;
              height: number | null;
              dimensionUnit: string;
            }>
          ) => {
            console.log("Updated variants:", updatedVariants);
          },
        });
      } else if (action === "history") {
        pushPriceHistoryModal({
          currentPrice: actualPrice,
          compareAtPrice: actualCompareAtPrice,
          costPrice: actualCostPrice,
          priceSource,
          priceHistory: actualPriceHistory,
          scheduledPrices: actualScheduledPrices,
          variants: variantPrices?.map((v) => ({
            id: v.variantId,
            title: v.variantTitle,
            price: v.currentPrice,
            compareAtPrice: v.compareAtPrice,
            priceHistory: v.priceHistory,
            scheduledPrices: generateMockScheduledPrices(v.currentPrice),
          })),
          variantId: selectedVariantId,
          formatPrice: formatPriceProp,
        });
      } else {
        onMoreAction?.(action);
      }
    },
    [
      pushEditVariantsModal,
      pushPriceHistoryModal,
      actualPrice,
      actualCompareAtPrice,
      actualCostPrice,
      priceSource,
      actualPriceHistory,
      actualScheduledPrices,
      variantPrices,
      variants,
      selectedVariantId,
      formatPriceProp,
      onMoreAction,
    ]
  );

  return (
    <Paper className={styles.card}>
      <PricingHeader
        title={title}
        variants={variantOptions}
        selectedVariantId={selectedVariantId}
        onVariantSelect={handleVariantSelect}
        onMoreAction={handleMoreAction}
        formatPrice={formatPrice}
      />

      <div className={styles.twoColumn}>
        <div className={styles.priceColumnWrapper}>
          <CurrentPriceColumn data={pricingData} formatPrice={formatPrice} />
        </div>
        <div className={styles.chartColumnWrapper}>
          <PriceHistoryChart
            history={actualPriceHistory}
            formatPrice={formatPrice}
            changesCount={changesCount}
            onViewLog={onViewLog}
          />
        </div>
      </div>

      <KPIRow data={pricingData} formatPrice={formatPrice} />
    </Paper>
  );
};

export { generateMockHistory, getMockVariantPrices };
export type { IPricingData, IVariantOption, PriceSource, MarginStatus };
