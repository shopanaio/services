import { Typography, Flex } from "antd";
import { PeriodSwitch } from "../../period-switch";
import { CHART_PERIODS } from "../../../utils/periods";
import { PriceChart } from "./price-chart";
import { useStyles } from "../pricing-block.styles";
import type { ApiVariantPriceConnection, CurrencyCode } from "@/graphql/types";

export interface IPriceHistoryChartColumnProps {
  history: ApiVariantPriceConnection;
  period: string;
  onPeriodChange: (period: string) => void;
  currency?: CurrencyCode | null;
}

export const PriceHistoryChartColumn = ({
  history,
  period,
  onPeriodChange,
  currency,
}: IPriceHistoryChartColumnProps) => {
  const { styles } = useStyles();

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
          value={period}
          onChange={onPeriodChange}
        />
      </Flex>

      <PriceChart
        history={history}
        currency={currency}
        height={100}
        gridLineCount={3}
      />
    </div>
  );
};
