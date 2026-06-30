import { Typography } from "antd";
import { DollarOutlined } from "@ant-design/icons";
import { useStyles } from "./pricing-empty-state.styles";

export const PricingEmptyState = () => {
  const { styles } = useStyles();

  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <DollarOutlined />
      </div>
      <div className={styles.emptyContent}>
        <Typography.Title level={5} className={styles.emptyTitle}>
          No price set for this variant
        </Typography.Title>
        <Typography.Text type="secondary" className={styles.emptyText}>
          Add the first price to start tracking current pricing, history, and
          period statistics.
        </Typography.Text>
      </div>
    </div>
  );
};
