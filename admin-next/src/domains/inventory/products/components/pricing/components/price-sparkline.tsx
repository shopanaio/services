import { createStyles } from "antd-style";
import type { IPriceHistoryRecord } from "../types";

const useStyles = createStyles(({ token }) => ({
  svg: {
    display: "block",
    background: token.colorBgLayout,
    borderRadius: 4,
  },
  up: {
    "--sparkline-stroke": token.colorError,
    "--sparkline-fill": token.colorErrorBg,
  },
  down: {
    "--sparkline-stroke": token.colorSuccess,
    "--sparkline-fill": token.colorSuccessBg,
  },
}));

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
  const { styles } = useStyles();

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

  const areaPath = `M ${points[0]} L ${points.join(" L ")} L ${
    padding + chartWidth
  },${padding + chartHeight} L ${padding},${padding + chartHeight} Z`;

  return (
    <svg width={width} height={height} className={`${styles.svg} ${isUp ? styles.up : styles.down}`}>
      <path d={areaPath} fill="var(--sparkline-fill)" />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="var(--sparkline-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={points[points.length - 1].split(",")[0]}
        cy={points[points.length - 1].split(",")[1]}
        r="3"
        fill="var(--sparkline-stroke)"
      />
      <circle
        cx={points[0].split(",")[0]}
        cy={points[0].split(",")[1]}
        r="2"
        fill="var(--sparkline-stroke)"
        opacity="0.5"
      />
    </svg>
  );
};
