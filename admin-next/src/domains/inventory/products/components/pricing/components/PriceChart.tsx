import { useState, useMemo, useCallback } from "react";
import { createStyles } from "antd-style";
import type { IPriceHistoryRecord, IChartPoint } from "../types";
import { formatShortDate, formatPrice as defaultFormatPrice } from "../utils";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  chartSvg: {
    display: "block",
    width: "100%",
    cursor: "crosshair",
  },
  chartSvgWithBg: {
    display: "block",
    width: "100%",
    cursor: "crosshair",
    background: token.colorBgLayout,
    borderRadius: 8,
  },
}));

// ============================================================================
// Types
// ============================================================================

interface IPriceChartProps {
  history: IPriceHistoryRecord[];
  formatPrice?: (amount: number) => string;
  height?: number;
  showBackground?: boolean;
  showAxisLabels?: boolean;
  showDateLabels?: boolean;
  gridLineCount?: number;
}

// ============================================================================
// Component
// ============================================================================

export const PriceChart = ({
  history,
  formatPrice = defaultFormatPrice,
  height = 100,
  showBackground = false,
  showAxisLabels = false,
  showDateLabels = false,
  gridLineCount = 3,
}: IPriceChartProps) => {
  const { styles, theme } = useStyles();
  const [hoveredPoint, setHoveredPoint] = useState<IChartPoint | null>(null);

  const prices = useMemo(
    () => [...history].reverse().map((h) => h.amount),
    [history]
  );

  const min = prices.length > 0 ? Math.min(...prices) : 0;
  const max = prices.length > 0 ? Math.max(...prices) : 0;

  const width = 800;
  const padding = {
    top: 12,
    right: showAxisLabels ? 20 : 12,
    bottom: showDateLabels ? 30 : 12,
    left: showAxisLabels ? 20 : 12,
  };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const range = max - min || 1;
  const points: IChartPoint[] = prices.map((price, i) => {
    const x = padding.left + (i / Math.max(prices.length - 1, 1)) * chartWidth;
    const y = padding.top + chartHeight - ((price - min) / range) * chartHeight;
    const record = history[history.length - 1 - i];
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

  const gridLines = useMemo(() => {
    return Array.from({ length: gridLineCount }, (_, i) => {
      const ratio = i / (gridLineCount - 1);
      return {
        y: padding.top + chartHeight * (1 - ratio),
        value: min + range * ratio,
      };
    });
  }, [gridLineCount, padding.top, chartHeight, min, range]);

  const dateLabels = useMemo(() => {
    if (!showDateLabels || points.length < 2) return [];
    const labelCount = Math.min(5, points.length);
    const step = Math.floor((points.length - 1) / (labelCount - 1));
    return Array.from({ length: labelCount }, (_, i) => {
      const idx = Math.min(i * step, points.length - 1);
      return points[idx];
    });
  }, [showDateLabels, points]);

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
    [points, width]
  );

  const currentPoint = points.find((p) => p.isCurrent);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={showBackground ? styles.chartSvgWithBg : styles.chartSvg}
      style={{ height }}
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
            strokeDasharray={showAxisLabels ? "4,4" : "2,2"}
          />
          {showAxisLabels && (
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
          )}
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
