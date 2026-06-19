import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { graphic } from "echarts";
import { useTheme } from "antd-style";
import type { ApiVariantPriceConnection, CurrencyCode } from "../types";
import { formatShortDate, formatPrice } from "../utils";

interface IPriceChartProps {
  history: ApiVariantPriceConnection;
  currency?: CurrencyCode | null;
  height?: number;
  showAxisLabels?: boolean;
  showDateLabels?: boolean;
  gridLineCount?: number;
}

export const PriceChart = ({
  history,
  currency,
  height = 100,
  showAxisLabels = false,
  showDateLabels = false,
  gridLineCount = 3,
}: IPriceChartProps) => {
  const theme = useTheme();

  const chartData = useMemo(() => {
    // Convert API format to chart format and reverse for chronological order
    const items = history.edges.map((edge, index) => ({
      date: new Date(edge.node.effectiveFrom),
      value: edge.node.amountMinor,
      currency: edge.node.currency,
      isCurrent: index === 0, // First item is the current price
    }));
    return items.reverse();
  }, [history]);

  const option = useMemo(() => {
    const dates = chartData.map((d) => formatShortDate(d.date));
    const values = chartData.map((d) => d.value);
    const currentIndex = chartData.findIndex((d) => d.isCurrent);
    const axisCurrency = currency ?? chartData[0]?.currency;

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
          formatter: (value: number) =>
            formatPrice(Math.round(value), axisCurrency),
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
          color: theme.colorTextLightSolid,
          fontSize: 12,
        },
        formatter: (params: { dataIndex: number; value: number }[]) => {
          const point = params[0];
          const item = chartData[point.dataIndex];
          const price = formatPrice(point.value, item.currency ?? axisCurrency);
          return `<div style="font-weight:600">${price}</div>
                  <div style="opacity:0.7;font-size:10px">${formatShortDate(
                    item.date
                  )}</div>`;
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
          symbolSize: (_value: number, params: { dataIndex: number }) => {
            return params.dataIndex === currentIndex ? 10 : 6;
          },
          itemStyle: {
            color: theme.colorBgContainer,
            borderColor: theme.colorPrimary,
            borderWidth: 2,
          },
          emphasis: {
            itemStyle: {
              color: theme.colorPrimary,
              borderColor: theme.colorPrimary,
              borderWidth: 2,
            },
            areaStyle: {
              color: new graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: theme.blue2 },
                { offset: 1, color: theme.geekblue3 },
              ]),
            },
            scale: 1.5,
          },
          lineStyle: {
            color: theme.colorPrimary,
            width: 2,
          },
          areaStyle: {
            color: new graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: theme.blue2 },
              { offset: 1, color: theme.geekblue2 },
            ]),
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
                        borderColor: theme.colorBgContainer,
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
    currency,
  ]);

  return (
    <ReactECharts
      option={option}
      opts={{ renderer: "svg" }}
      style={{
        height,
        width: "100%",
        cursor: "crosshair",
      }}
      notMerge
    />
  );
};
