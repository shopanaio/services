import { Typography, Flex } from "antd";
import { PeriodSwitch } from "../../period-switch";
import { CHART_PERIODS } from "../../../utils/periods";
import { PriceChart, type PriceChartPoint } from "./price-chart";
import { useStyles } from "../pricing-block.styles";
import type { ApiVariantPriceConnection, CurrencyCode } from "@/graphql/types";

export interface IPriceHistoryChartColumnProps {
  history?: ApiVariantPriceConnection;
  points?: PriceChartPoint[];
  period: string;
  onPeriodChange: (period: string) => void;
  currency?: CurrencyCode | null;
  label?: string;
  valueFormatter?: (value: number, point: PriceChartPoint) => string;
  showPointSymbols?: boolean;
}

export const PriceHistoryChartColumn = ({
  history,
  points,
  period,
  onPeriodChange,
  currency,
  label = "Price history",
  valueFormatter,
  showPointSymbols,
}: IPriceHistoryChartColumnProps) => {
  const { styles } = useStyles();

  return (
    <div className={styles.column}>
      <Flex align="center" justify="space-between" style={{ marginBottom: 8 }}>
        <Typography.Text className={styles.sectionLabel} style={{ marginBottom: 0 }}>
          {label}
        </Typography.Text>

        <PeriodSwitch periods={CHART_PERIODS} value={period} onChange={onPeriodChange} />
      </Flex>

      <PriceChart
        history={history}
        points={points}
        currency={currency}
        height={100}
        gridLineCount={3}
        valueFormatter={valueFormatter}
        showPointSymbols={showPointSymbols}
      />
    </div>
  );
};
