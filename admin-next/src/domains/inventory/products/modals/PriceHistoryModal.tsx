"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Typography, Flex, Select, Button, Empty } from "antd";
import {
  ClockCircleOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { createStyles } from "antd-style";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper } from "../components/Paper";
import { PaperHeader } from "../components/PaperHeader";
import { Tile } from "../components/Tile";
import { PeriodSwitch, KPI_PERIODS, KPIPeriod } from "../components/PeriodSwitch";
import {
  IPriceHistoryRecord,
  IScheduledPriceRecord,
  PriceChangeIndicator,
  PriceHistoryTimeline,
} from "../components/pricing/PriceHistory";
import type { IProductPriceHistoryModalPayload } from "../modals";

// ============================================================================
// Constants
// ============================================================================

const NBSP = "\u00A0";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  variantSelect: {
    minWidth: 200,
    ".ant-select-selector": {
      fontSize: "13px !important",
    },
  },
  warningIcon: {
    color: token.colorWarning,
    fontSize: 10,
  },
  overviewPaper: {
    padding: 16,
  },
  currentPriceSection: {
    marginBottom: 16,
  },
  currentPriceRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 12,
    flexWrap: "wrap",
  },
  mainPrice: {
    "&&": {
      fontSize: 28,
      fontWeight: 700,
      margin: 0,
      lineHeight: 1.2,
    },
  },
  compareAtPrice: {
    fontSize: 16,
  },
  chartSection: {
    marginBottom: 16,
  },
  chartHeader: {
    marginBottom: 12,
  },
  chartSvg: {
    display: "block",
    width: "100%",
    height: 180,
    cursor: "crosshair",
    background: token.colorBgLayout,
    borderRadius: 8,
  },
  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8,
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
  changeLogPaper: {
    padding: 16,
  },
  timelineContainer: {
    maxHeight: 400,
    overflowY: "auto",
  },
  scheduledPaper: {
    padding: 16,
  },
  scheduledItem: {
    padding: 12,
    background: token.colorBgLayout,
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    marginBottom: 8,
    "&:last-child": {
      marginBottom: 0,
    },
  },
  scheduledItemHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  scheduledIcon: {
    color: token.colorPrimary,
    fontSize: 14,
  },
  scheduledPrice: {
    fontSize: 16,
    fontWeight: 600,
  },
  scheduledChange: {
    fontSize: 12,
  },
  scheduledMeta: {
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  scheduledReason: {
    fontSize: 11,
    color: token.colorTextTertiary,
    marginTop: 4,
  },
  scheduledActions: {
    marginLeft: "auto",
    display: "flex",
    gap: 4,
  },
  emptyScheduled: {
    padding: "24px 0",
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

const formatDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const defaultFormatPrice = (amount: number): string => {
  const formatted = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
  return formatted.replace(/\s+/g, NBSP);
};

// ============================================================================
// Chart Component
// ============================================================================

interface IEnhancedChartProps {
  history: IPriceHistoryRecord[];
  formatPrice: (amount: number) => string;
  timeRange: KPIPeriod;
}

const EnhancedPriceChart = ({
  history,
  formatPrice,
  timeRange,
}: IEnhancedChartProps) => {
  const { styles, theme } = useStyles();
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    price: number;
    date: Date;
    isCurrent?: boolean;
  } | null>(null);

  const filteredHistory = useMemo(() => {
    if (timeRange === "all") return history;

    const now = new Date();
    let days: number;
    switch (timeRange) {
      case "7d":
        days = 7;
        break;
      case "30d":
        days = 30;
        break;
      case "90d":
        days = 90;
        break;
      case "ytd":
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return history.filter((h) => h.effectiveFrom >= startOfYear);
      default:
        days = 30;
    }
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return history.filter((h) => h.effectiveFrom >= cutoff);
  }, [history, timeRange]);

  const prices = useMemo(
    () => [...filteredHistory].reverse().map((h) => h.amount),
    [filteredHistory]
  );

  const min = prices.length > 0 ? Math.min(...prices) : 0;
  const max = prices.length > 0 ? Math.max(...prices) : 0;

  const width = 800;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 20 };
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

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    y: padding.top + chartHeight * (1 - ratio),
    value: min + range * ratio,
  }));

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (points.length < 2) return;

      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * width;

      let closest = points[0];
      let minDist = Math.abs(mouseX - points[0].x);

      for (const point of points) {
        const dist = Math.abs(mouseX - point.x);
        if (dist < minDist) {
          minDist = dist;
          closest = point;
        }
      }

      if (minDist < 50) {
        setHoveredPoint(closest);
      } else {
        setHoveredPoint(null);
      }
    },
    [points]
  );

  const currentPoint = points.find((p) => p.isCurrent);

  // X-axis date labels
  const dateLabels = useMemo(() => {
    if (points.length < 2) return [];
    const labelCount = Math.min(5, points.length);
    const step = Math.floor((points.length - 1) / (labelCount - 1));
    return Array.from({ length: labelCount }, (_, i) => {
      const idx = Math.min(i * step, points.length - 1);
      return points[idx];
    });
  }, [points]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={styles.chartSvg}
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
            stroke={theme.colorBorderSecondary}
            strokeDasharray="4,4"
          />
          <text
            x={padding.left - 5}
            y={line.y}
            textAnchor="end"
            dominantBaseline="middle"
            fill={theme.colorTextSecondary}
            fontSize="10"
          >
            {formatPrice(Math.round(line.value))}
          </text>
        </g>
      ))}

      {/* X-axis date labels */}
      {dateLabels.map((point, i) => (
        <text
          key={i}
          x={point.x}
          y={height - 8}
          textAnchor="middle"
          fill={theme.colorTextSecondary}
          fontSize="10"
        >
          {formatShortDate(point.date)}
        </text>
      ))}

      {/* Area fill */}
      {areaPath && <path d={areaPath} fill="rgba(22, 119, 255, 0.08)" />}

      {/* Line */}
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

      {/* Points */}
      {points.map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r={hoveredPoint === point ? 5 : 3}
          fill={hoveredPoint === point ? theme.colorPrimary : "white"}
          stroke={theme.colorPrimary}
          strokeWidth="2"
        />
      ))}

      {/* Current point highlight */}
      {currentPoint && currentPoint !== hoveredPoint && (
        <circle
          cx={currentPoint.x}
          cy={currentPoint.y}
          r="5"
          fill={theme.colorPrimary}
          stroke="white"
          strokeWidth="2"
        />
      )}

      {/* Hover tooltip */}
      {hoveredPoint && (
        <g>
          {/* Vertical line */}
          <line
            x1={hoveredPoint.x}
            y1={padding.top}
            x2={hoveredPoint.x}
            y2={padding.top + chartHeight}
            stroke={theme.colorPrimary}
            strokeDasharray="4,4"
            opacity={0.5}
          />
          {/* Tooltip box */}
          <rect
            x={Math.min(Math.max(hoveredPoint.x - 50, 5), width - 105)}
            y={Math.max(hoveredPoint.y - 42, 5)}
            width={100}
            height={36}
            rx={4}
            fill={theme.colorTextBase}
          />
          <text
            x={Math.min(Math.max(hoveredPoint.x, 55), width - 55)}
            y={Math.max(hoveredPoint.y - 26, 18)}
            textAnchor="middle"
            fill="white"
            fontSize="12"
            fontWeight="600"
          >
            {formatPrice(hoveredPoint.price)}
          </text>
          <text
            x={Math.min(Math.max(hoveredPoint.x, 55), width - 55)}
            y={Math.max(hoveredPoint.y - 12, 32)}
            textAnchor="middle"
            fill="rgba(255,255,255,0.7)"
            fontSize="10"
          >
            {formatShortDate(hoveredPoint.date)}
          </text>
        </g>
      )}
    </svg>
  );
};

// ============================================================================
// Scheduled Price Item Component
// ============================================================================

interface IScheduledPriceItemProps {
  item: IScheduledPriceRecord;
  currentPrice: number;
  formatPrice: (amount: number) => string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const ScheduledPriceItem = ({
  item,
  currentPrice,
  formatPrice,
  onEdit,
  onDelete,
}: IScheduledPriceItemProps) => {
  const { styles } = useStyles();

  const priceDiff = item.amount - currentPrice;
  const percentChange = currentPrice > 0
    ? Math.round((priceDiff / currentPrice) * 100)
    : 0;
  const isIncrease = priceDiff > 0;

  return (
    <div className={styles.scheduledItem}>
      <div className={styles.scheduledItemHeader}>
        <ClockCircleOutlined className={styles.scheduledIcon} />
        <Typography.Text className={styles.scheduledPrice}>
          {formatPrice(item.amount)}
        </Typography.Text>
        {percentChange !== 0 && (
          <Typography.Text
            className={styles.scheduledChange}
            type={isIncrease ? "danger" : "success"}
          >
            ({isIncrease ? "+" : ""}{percentChange}%)
          </Typography.Text>
        )}
        <div className={styles.scheduledActions}>
          {onEdit && (
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(item.id)}
            />
          )}
          {onDelete && (
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(item.id)}
            />
          )}
        </div>
      </div>
      <Typography.Text className={styles.scheduledMeta}>
        Starts: {formatDateTime(item.startsAt)}
        {item.endsAt && ` — Ends: ${formatDateTime(item.endsAt)}`}
      </Typography.Text>
      {item.reason && (
        <Typography.Text className={styles.scheduledReason}>
          {item.reason}
        </Typography.Text>
      )}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const PriceHistoryModal = () => {
  const { styles } = useStyles();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IProductPriceHistoryModalPayload;

  const [timeRange, setTimeRange] = useState<KPIPeriod>("30d");
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    typedPayload.variantId || (typedPayload.variants?.length ? "all" : undefined)
  );

  const formatPrice = typedPayload.formatPrice || defaultFormatPrice;

  const isAllVariants = selectedVariantId === "all";

  // Get selected variant data
  const selectedVariant = isAllVariants
    ? undefined
    : typedPayload.variants?.find((v) => v.id === selectedVariantId);

  // Combine all variants data when "All variants" is selected
  const allVariantsHistory = useMemo(() => {
    if (!typedPayload.variants?.length) return [];
    const combined: IPriceHistoryRecord[] = [];
    typedPayload.variants.forEach((v) => {
      v.priceHistory.forEach((h) => {
        combined.push({
          ...h,
          id: `${v.id}-${h.id}`,
        });
      });
    });
    return combined.sort(
      (a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime()
    );
  }, [typedPayload.variants]);

  const allVariantsScheduled = useMemo(() => {
    if (!typedPayload.variants?.length) return [];
    const combined: IScheduledPriceRecord[] = [];
    typedPayload.variants.forEach((v) => {
      v.scheduledPrices?.forEach((s) => {
        combined.push({
          ...s,
          id: `${v.id}-${s.id}`,
          reason: `${v.title}: ${s.reason || "Scheduled change"}`,
        });
      });
    });
    return combined.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }, [typedPayload.variants]);

  const currentPrice = isAllVariants
    ? typedPayload.currentPrice
    : (selectedVariant?.price ?? typedPayload.currentPrice);
  const compareAtPrice = isAllVariants
    ? typedPayload.compareAtPrice
    : (selectedVariant?.compareAtPrice ?? typedPayload.compareAtPrice);
  const priceHistory = isAllVariants
    ? allVariantsHistory
    : (selectedVariant?.priceHistory ?? typedPayload.priceHistory);
  const scheduledPrices = isAllVariants
    ? allVariantsScheduled
    : (selectedVariant?.scheduledPrices ?? typedPayload.scheduledPrices ?? []);

  // Calculate stats
  const prices = priceHistory.map((h) => h.amount);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const avgPrice =
    prices.length > 0
      ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      : 0;
  const changesCount = priceHistory.length - 1;

  const previousPrice = priceHistory[1]?.amount ?? null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        pop();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pop]);

  // Variant select options
  const variantOptions = useMemo(() => {
    if (!typedPayload.variants?.length) return [];

    const options = [
      {
        value: "all",
        label: (
          <Flex justify="space-between" align="center" style={{ width: "100%" }}>
            <span style={{ fontWeight: 500 }}>All variants</span>
            <Typography.Text type="secondary" style={{ marginLeft: 24 }}>
              {typedPayload.variants.length} variants
            </Typography.Text>
          </Flex>
        ),
      },
      ...typedPayload.variants.map((v) => ({
        value: v.id,
        label: (
          <Flex justify="space-between" align="center" style={{ width: "100%" }}>
            <span>{v.title}</span>
            <Typography.Text style={{ fontWeight: 600, marginLeft: 24 }}>
              {formatPrice(v.price)}
            </Typography.Text>
          </Flex>
        ),
      })),
    ];

    return options;
  }, [typedPayload.variants, formatPrice]);

  return (
    <ModalLayout
      name="price-history"
      header={
        <ModalHeader
          name="price-history"
          title="Price History"
          onClose={pop}
          submitButtonProps={null}
        />
      }
    >
      {/* Overview Section */}
      <Paper className={styles.overviewPaper}>
        {/* Variant Selector */}
        {typedPayload.variants && typedPayload.variants.length > 1 && (
          <div style={{ marginBottom: 16 }}>
            <Typography.Text
              type="secondary"
              style={{ fontSize: 11, textTransform: "uppercase", display: "block", marginBottom: 8 }}
            >
              Variant
            </Typography.Text>
            <Select
              value={selectedVariantId}
              onChange={setSelectedVariantId}
              popupMatchSelectWidth={false}
              className={styles.variantSelect}
              options={variantOptions}
            />
          </div>
        )}

        <div className={styles.currentPriceSection}>
          <Typography.Text
            type="secondary"
            style={{ fontSize: 11, textTransform: "uppercase", display: "block", marginBottom: 8 }}
          >
            Current Price
          </Typography.Text>
          <div className={styles.currentPriceRow}>
            <Typography.Title level={2} className={styles.mainPrice}>
              {formatPrice(currentPrice)}
            </Typography.Title>
            {previousPrice && previousPrice !== currentPrice && (
              <PriceChangeIndicator
                currentPrice={currentPrice}
                previousPrice={previousPrice}
              />
            )}
            {compareAtPrice && compareAtPrice > currentPrice && (
              <Typography.Text
                delete
                type="secondary"
                className={styles.compareAtPrice}
              >
                {formatPrice(compareAtPrice)}
              </Typography.Text>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className={styles.chartSection}>
          <Flex
            align="center"
            justify="space-between"
            className={styles.chartHeader}
          >
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Price Trend
            </Typography.Text>
            <PeriodSwitch
              periods={KPI_PERIODS}
              value={timeRange}
              onChange={setTimeRange}
            />
          </Flex>
          <EnhancedPriceChart
            history={priceHistory}
            formatPrice={formatPrice}
            timeRange={timeRange}
          />
        </div>

        {/* KPI Row */}
        <div className={styles.kpiRow}>
          <Tile
            label="Min"
            value={formatPrice(minPrice)}
            tooltip="Minimum price in period"
            centered
            className={styles.kpiTile}
            variant="success"
          />
          <Tile
            label="Max"
            value={formatPrice(maxPrice)}
            tooltip="Maximum price in period"
            centered
            className={styles.kpiTile}
            variant="danger"
          />
          <Tile
            label="Average"
            value={formatPrice(avgPrice)}
            tooltip="Average price over period"
            centered
            className={styles.kpiTile}
          />
          <Tile
            label="Changes"
            value={String(changesCount)}
            tooltip="Total number of price changes"
            centered
            className={styles.kpiTile}
          />
        </div>
      </Paper>

      {/* Scheduled Changes Section */}
      <Paper className={styles.scheduledPaper}>
        <PaperHeader
          title="Scheduled"
          extra={
            typedPayload.onAddScheduled && (
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                onClick={typedPayload.onAddScheduled}
              >
                Add
              </Button>
            )
          }
        />
        {scheduledPrices.length > 0 ? (
          <div>
            {scheduledPrices.map((item) => (
              <ScheduledPriceItem
                key={item.id}
                item={item}
                currentPrice={currentPrice}
                formatPrice={formatPrice}
                onEdit={typedPayload.onEditScheduled}
                onDelete={typedPayload.onDeleteScheduled}
              />
            ))}
          </div>
        ) : (
          <Empty
            className={styles.emptyScheduled}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No scheduled price changes"
          />
        )}
      </Paper>

      {/* Change Log Section */}
      <Paper className={styles.changeLogPaper}>
        <PaperHeader title="Price Changes" />
        <div className={styles.timelineContainer}>
          <PriceHistoryTimeline history={priceHistory} />
        </div>
      </Paper>
    </ModalLayout>
  );
};
