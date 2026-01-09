import { Typography, Flex, Timeline, Tag } from "antd";
import { createStyles } from "antd-style";
import type { IPriceHistoryRecord } from "../types";
import { formatPrice, formatDateFull } from "../utils";
import { PriceChangeIndicator } from "./PriceChangeIndicator";
import { DiscountBadge } from "./DiscountBadge";

const useStyles = createStyles(({ token }) => ({
  timeline: {
    padding: "12px 0 0 0",
    margin: 0,
    ".ant-timeline-item": {
      paddingBottom: 12,
    },
    ".ant-timeline-item:last-child": {
      paddingBottom: 0,
    },
    ".ant-timeline-item-tail": {
      borderInlineStart: `2px solid ${token.colorBorderSecondary}`,
    },
  },
  priceText: {
    fontSize: 13,
  },
  compareText: {
    fontSize: 11,
  },
  currentTag: {
    margin: 0,
    fontSize: 10,
    lineHeight: "16px",
    padding: "0 4px",
  },
  dateText: {
    fontSize: 11,
    display: "block",
    marginTop: 4,
  },
}));

interface IPriceTimelineProps {
  history: IPriceHistoryRecord[];
}

export const PriceTimeline = ({ history }: IPriceTimelineProps) => {
  const { styles } = useStyles();

  return (
    <Timeline
      className={styles.timeline}
      items={history.map((record, idx) => {
        const prevRecord = history[idx + 1];
        const priceChange = prevRecord
          ? record.amount - prevRecord.amount
          : null;
        const isIncrease = priceChange !== null && priceChange > 0;
        const isDecrease = priceChange !== null && priceChange < 0;

        return {
          color: record.isCurrent
            ? "blue"
            : isDecrease
            ? "green"
            : isIncrease
            ? "red"
            : "gray",
          children: (
            <div>
              <Flex align="center" gap="small" wrap="wrap">
                <Typography.Text
                  strong={record.isCurrent}
                  className={styles.priceText}
                >
                  {formatPrice(record.amount)}
                </Typography.Text>
                {record.compareAt && (
                  <>
                    <Typography.Text
                      delete
                      type="secondary"
                      className={styles.compareText}
                    >
                      {formatPrice(record.compareAt)}
                    </Typography.Text>
                    <DiscountBadge
                      price={record.amount}
                      compareAtPrice={record.compareAt}
                      size="small"
                      showSaving={false}
                    />
                  </>
                )}
                {priceChange !== null && (
                  <PriceChangeIndicator
                    currentPrice={record.amount}
                    previousPrice={prevRecord.amount}
                    size="small"
                  />
                )}
                {record.isCurrent && (
                  <Tag
                    color="blue"
                    className={styles.currentTag}
                    variant="outlined"
                  >
                    current
                  </Tag>
                )}
              </Flex>
              <Typography.Text type="secondary" className={styles.dateText}>
                {formatDateFull(record.effectiveFrom)}
                {record.effectiveTo &&
                  ` — ${formatDateFull(record.effectiveTo)}`}
              </Typography.Text>
            </div>
          ),
        };
      })}
    />
  );
};

// Alias for backward compatibility
export const PriceHistoryTimeline = PriceTimeline;
