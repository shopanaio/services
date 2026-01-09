import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { useTheme } from "antd-style";
import type { IPriceHistoryRecord } from "../types";
import { formatShortDate, formatPrice as defaultFormatPrice } from "../utils";

interface IPriceChartProps {
  history: IPriceHistoryRecord[];
  formatPrice?: (amount: number) => string;
  height?: number;
  showBackground?: boolean;
  showAxisLabels?: boolean;
  showDateLabels?: boolean;
  gridLineCount?: number;
}

export const PriceChart = ({
  history,
  formatPrice = defaultFormatPrice,
  height = 100,
  showBackground = false,
  showAxisLabels = false,
  showDateLabels = false,
  gridLineCount = 3,
}: IPriceChartProps) => {
  const theme = useTheme();

  const chartData = useMemo(() => {
    const reversed = [...history].reverse();
    return reversed.map((h) => ({
      date: h.effectiveFrom,
      value: h.amount,
      isCurrent: h.isCurrent,
    }));
  }, [history]);

  const option = useMemo(() => {
    const dates = chartData.map((d) => formatShortDate(d.date));
    const values = chartData.map((d) => d.value);
    const currentIndex = chartData.findIndex((d) => d.isCurrent);

    return {
      grid: {
        top: 12,
        right: showAxisLabels ? 20 : 12,
        bottom: showDateLabels ? 30 : 12,
        left: showAxisLabels ? 50 : 12,
        containLabel: false,
      },
      xAxis: {
        type: "category",
        data: dates,
        show: showDateLabels,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: theme.colorTextSecondary,
          fontSize: 10,
          interval: Math.max(0, Math.floor(dates.length / 5) - 1),
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        show: showAxisLabels,
        splitNumber: gridLineCount - 1,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: theme.colorTextSecondary,
          fontSize: 10,
          formatter: (value: number) => formatPrice(Math.round(value)),
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: theme.colorBorderSecondary,
            type: showAxisLabels ? [4, 4] : [2, 2],
          },
        },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: theme.colorTextBase,
        borderColor: "transparent",
        padding: [8, 12],
        textStyle: {
          color: "#fff",
          fontSize: 12,
        },
        formatter: (params: { dataIndex: number; value: number }[]) => {
          const point = params[0];
          const item = chartData[point.dataIndex];
          return `<div style="font-weight:600">${formatPrice(point.value)}</div>
                  <div style="color:rgba(255,255,255,0.7);font-size:10px">${formatShortDate(item.date)}</div>`;
        },
        axisPointer: {
          type: "line",
          lineStyle: {
            color: theme.colorPrimary,
            type: [4, 4],
            opacity: 0.5,
          },
        },
      },
      series: [
        {
          type: "line",
          data: values,
          smooth: false,
          symbol: "circle",
          symbolSize: (value: number, params: { dataIndex: number }) => {
            return params.dataIndex === currentIndex ? 10 : 6;
          },
          itemStyle: {
            color: "#fff",
            borderColor: theme.colorPrimary,
            borderWidth: 2,
          },
          emphasis: {
            itemStyle: {
              color: theme.colorPrimary,
              borderColor: theme.colorPrimary,
              borderWidth: 2,
            },
            scale: 1.5,
          },
          lineStyle: {
            color: theme.colorPrimary,
            width: 2,
          },
          areaStyle: {
            color: "rgba(22, 119, 255, 0.08)",
          },
          markPoint:
            currentIndex >= 0
              ? {
                  data: [
                    {
                      coord: [currentIndex, values[currentIndex]],
                      symbol: "circle",
                      symbolSize: 10,
                      itemStyle: {
                        color: theme.colorPrimary,
                        borderColor: "#fff",
                        borderWidth: 2,
                      },
                    },
                  ],
                  silent: true,
                }
              : undefined,
        },
      ],
    };
  }, [
    chartData,
    theme,
    showAxisLabels,
    showDateLabels,
    gridLineCount,
    formatPrice,
  ]);

  return (
    <ReactECharts
      option={option}
      opts={{ renderer: "svg" }}
      style={{
        height,
        width: "100%",
        background: showBackground ? theme.colorBgLayout : undefined,
        borderRadius: showBackground ? 8 : undefined,
        cursor: "crosshair",
      }}
      notMerge
    />
  );
};
