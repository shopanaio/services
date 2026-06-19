import { Typography, Flex } from "antd";
import { createStyles } from "antd-style";
import type { ApiVariantPrice } from "../types";
import { formatPrice } from "../utils";

const useStyles = createStyles(({ token }) => ({
  container: {
    fontSize: 11,
  },
  containerStretched: {
    fontSize: 11,
    width: "100%",
  },
  labelText: {
    fontSize: 10,
  },
  valueText: {
    fontSize: 12,
  },
  minValue: {
    fontSize: 12,
    color: token.colorSuccess,
  },
  maxValue: {
    fontSize: 12,
    color: token.colorError,
  },
}));

interface IPriceStatsProps {
  history: ApiVariantPrice[];
  showChangesCount?: boolean;
  stretched?: boolean;
}

export const PriceStats = ({
  history,
  showChangesCount = true,
  stretched = false,
}: IPriceStatsProps) => {
  const { styles } = useStyles();

  if (history.length === 0) {
    return null;
  }

  const prices = history.map((h) => Number(h.amountMinor));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const currency = history[0]?.currency;

  return (
    <Flex
      gap={12}
      justify={stretched ? "space-between" : undefined}
      className={stretched ? styles.containerStretched : styles.container}
    >
      <Flex vertical align="center">
        <Typography.Text type="secondary" className={styles.labelText}>
          Min
        </Typography.Text>
        <Typography.Text className={styles.minValue}>
          {formatPrice(min, currency)}
        </Typography.Text>
      </Flex>
      <Flex vertical align="center">
        <Typography.Text type="secondary" className={styles.labelText}>
          Max
        </Typography.Text>
        <Typography.Text className={styles.maxValue}>
          {formatPrice(max, currency)}
        </Typography.Text>
      </Flex>
      <Flex vertical align="center">
        <Typography.Text type="secondary" className={styles.labelText}>
          Avg
        </Typography.Text>
        <Typography.Text className={styles.valueText}>
          {formatPrice(avg, currency)}
        </Typography.Text>
      </Flex>
      {showChangesCount && (
        <Flex vertical align="center">
          <Typography.Text type="secondary" className={styles.labelText}>
            Changes
          </Typography.Text>
          <Typography.Text className={styles.valueText}>
            {history.length - 1}
          </Typography.Text>
        </Flex>
      )}
    </Flex>
  );
};
