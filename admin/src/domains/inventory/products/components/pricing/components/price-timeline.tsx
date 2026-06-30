import { Typography, Flex, Timeline, Tag } from "antd";
import { createStyles } from "antd-style";
import type {
  ApiVariantPrice,
  ApiVariantPriceConnection,
} from "@/graphql/types";
import {
  formatDateFull,
  formatPrice,
  useVariantPrice,
} from "../../../utils/price-formatting";
import { PriceChangeIndicator } from "./price-change-indicator";
import { DiscountBadge } from "./discount-badge";

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
  history: ApiVariantPriceConnection;
  dataTestId?: string;
}

interface IPriceTimelineEntryProps {
  record: ApiVariantPrice;
  previousRecord: ApiVariantPrice | null;
}

const PriceTimelineEntry = ({
  record,
  previousRecord,
}: IPriceTimelineEntryProps) => {
  const { styles } = useStyles();
  const formattedPrice = useVariantPrice(record);

  return (
    <div>
      <Flex align="center" gap="small" wrap="wrap">
        <Typography.Text
          strong={record.isCurrent}
          className={styles.priceText}
        >
          {formattedPrice}
        </Typography.Text>
        {record.compareAtMinor && (
          <>
            <Typography.Text
              delete
              type="secondary"
              className={styles.compareText}
            >
              {formatPrice(record.compareAtMinor, record.currency)}
            </Typography.Text>
            <DiscountBadge
              price={record.amountMinor}
              compareAtPrice={record.compareAtMinor}
              currency={record.currency}
              size="small"
              showSaving={false}
            />
          </>
        )}
        {previousRecord && (
          <PriceChangeIndicator
            currentPrice={record.amountMinor}
            previousPrice={previousRecord.amountMinor}
            size="small"
          />
        )}
        {record.isCurrent && (
          <Tag color="blue" className={styles.currentTag}>
            current
          </Tag>
        )}
      </Flex>
      <Typography.Text type="secondary" className={styles.dateText}>
        {formatDateFull(new Date(record.effectiveFrom))}
        {record.effectiveTo &&
          ` — ${formatDateFull(new Date(record.effectiveTo))}`}
      </Typography.Text>
    </div>
  );
};

export const PriceTimeline = ({ history, dataTestId }: IPriceTimelineProps) => {
  const { styles } = useStyles();

  return (
    <Timeline
      className={styles.timeline}
      items={history.edges.map((edge, idx) => {
        const record = edge.node;
        const prevEdge = history.edges[idx + 1];
        const priceChange = prevEdge
          ? record.amountMinor - prevEdge.node.amountMinor
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
            <div data-testid={dataTestId ? `${dataTestId}-item-${idx}` : undefined}>
              <PriceTimelineEntry
                record={record}
                previousRecord={
                  priceChange !== null ? prevEdge?.node ?? null : null
                }
              />
            </div>
          ),
        };
      })}
    />
  );
};

// Alias for backward compatibility
export const PriceHistoryTimeline = PriceTimeline;
