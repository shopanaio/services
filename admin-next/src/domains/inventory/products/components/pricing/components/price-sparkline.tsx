import { createStyles } from "antd-style";
import type { IPriceHistoryRecord } from "../types";

const useStyles = createStyles(({ token }) => ({
  svg: {
    display: "block",
    background: token.colorBgLayout,
    borderRadius: 4,
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
