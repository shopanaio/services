import { Typography, Flex } from "antd";
import { PeriodSwitch, CHART_PERIODS } from "../../period-switch";
import { PriceChart } from "./price-chart";
import { useStyles } from "../pricing-block.styles";
import type { IPriceHistoryChartColumnProps } from "../types";

export const PriceHistoryChartColumn = ({
  history,
  period,
  onPeriodChange,
  formatPrice,
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
        formatPrice={formatPrice}
        height={100}
        gridLineCount={3}
      />
    </div>
  );
};
