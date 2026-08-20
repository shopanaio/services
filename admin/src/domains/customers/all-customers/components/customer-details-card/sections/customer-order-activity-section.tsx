import { Divider, Typography } from "antd";
import { LuChartNoAxesCombined as ActivityOutlined } from "react-icons/lu";
import type { ApiCustomer } from "@/graphql/types";
import { EntityDetailsEmptyState } from "@/domains/inventory/components/entity-details-sections";
import { CopyableChip } from "@/ui-kit/copyable-chip";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useCustomerDetailsStyles } from "../customer-details-card.styles";
import {
  formatCustomerDate,
  formatCustomerMoney,
  shortCustomerId,
} from "../customer-details-utils";

export function CustomerOrderActivitySection({
  customer,
  currency,
}: {
  customer: ApiCustomer;
  currency: string | null;
}) {
  const { styles } = useCustomerDetailsStyles();
  const statistics = customer.statistics;
  const money = customer.monetaryStatistics.edges[0]?.node ?? null;

  return (
    <Paper data-testid="customer-order-activity-section">
      <PaperHeader title="Order activity" />
      {!statistics ? (
        <EntityDetailsEmptyState
          state={{ title: "No customer activity statistics yet" }}
          icon={<ActivityOutlined />}
        />
      ) : (
        <>
          <div className={styles.twoColumns}>
            <div>
              <Typography.Text strong>Order outcomes</Typography.Text>
              <div className={styles.metricRows} style={{ marginTop: 8 }}>
                <div className={styles.metricRow}>
                  <Typography.Text>Completed</Typography.Text>
                  <Typography.Text strong>{statistics.completedOrdersCount}</Typography.Text>
                </div>
                <div className={styles.metricRow}>
                  <Typography.Text>Cancelled</Typography.Text>
                  <Typography.Text strong>{statistics.cancelledOrdersCount}</Typography.Text>
                </div>
              </div>
            </div>
            <div>
              <Typography.Text strong>Money breakdown</Typography.Text>
              <div className={styles.metricRows} style={{ marginTop: 8 }}>
                <div className={styles.metricRow}>
                  <Typography.Text>Gross spent</Typography.Text>
                  <Typography.Text strong>
                    {formatCustomerMoney(money?.totalSpentMinor, currency)}
                  </Typography.Text>
                </div>
                <div className={styles.metricRow}>
                  <Typography.Text>Refunded</Typography.Text>
                  <Typography.Text strong>
                    {formatCustomerMoney(money?.totalRefundedMinor, currency)}
                  </Typography.Text>
                </div>
              </div>
            </div>
          </div>
          <Divider className={styles.sectionDivider} />
          <div className={styles.detailRows}>
            <div className={styles.detailRow}>
              <Typography.Text>First order</Typography.Text>
              <Typography.Text>{formatCustomerDate(statistics.firstOrderAt)}</Typography.Text>
              {statistics.firstOrderId ? (
                <CopyableChip
                  label="Order ID"
                  value={statistics.firstOrderId}
                  displayValue={shortCustomerId(statistics.firstOrderId)}
                  mono
                />
              ) : (
                <span />
              )}
            </div>
            <div className={styles.detailRow}>
              <Typography.Text>Last order</Typography.Text>
              <Typography.Text>{formatCustomerDate(statistics.lastOrderAt)}</Typography.Text>
              {statistics.lastOrderId ? (
                <CopyableChip
                  label="Order ID"
                  value={statistics.lastOrderId}
                  displayValue={shortCustomerId(statistics.lastOrderId)}
                  mono
                />
              ) : (
                <span />
              )}
            </div>
            <div className={styles.detailRow}>
              <Typography.Text>Last checkout</Typography.Text>
              <Typography.Text>{formatCustomerDate(statistics.lastCheckoutAt)}</Typography.Text>
              <span />
            </div>
            <div className={styles.detailRow}>
              <Typography.Text>Last activity</Typography.Text>
              <Typography.Text>{formatCustomerDate(customer.lastActivityAt)}</Typography.Text>
              <span />
            </div>
          </div>
        </>
      )}
    </Paper>
  );
}
