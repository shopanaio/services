import { Typography, Button } from "antd";
import {
  ClockCircleOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { createStyles } from "antd-style";
import type { IScheduledPriceRecord } from "../types";
import { formatDateTime } from "../../../components/pricing/utils";

const useStyles = createStyles(({ token }) => ({
  scheduledItem: {
    padding: 12,
    background: token.colorBgLayout,
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    marginBottom: 8,
    "&:last-child": {
      marginBottom: 0,
    },
  },
  scheduledItemHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  scheduledIcon: {
    color: token.colorPrimary,
    fontSize: 14,
  },
  scheduledPrice: {
    fontSize: 16,
    fontWeight: 600,
  },
  scheduledChange: {
    fontSize: 12,
  },
  scheduledMeta: {
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  scheduledReason: {
    fontSize: 11,
    color: token.colorTextTertiary,
    marginTop: 4,
  },
  scheduledActions: {
    marginLeft: "auto",
    display: "flex",
    gap: 4,
  },
}));

interface IScheduledPriceItemProps {
  item: IScheduledPriceRecord;
  currentPrice: number;
  formatPrice: (amount: number) => string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const ScheduledPriceItem = ({
  item,
  currentPrice,
  formatPrice,
  onEdit,
  onDelete,
}: IScheduledPriceItemProps) => {
  const { styles } = useStyles();

  const priceDiff = item.amount - currentPrice;
  const percentChange =
    currentPrice > 0 ? Math.round((priceDiff / currentPrice) * 100) : 0;
  const isIncrease = priceDiff > 0;

  return (
    <div className={styles.scheduledItem}>
      <div className={styles.scheduledItemHeader}>
        <ClockCircleOutlined className={styles.scheduledIcon} />
        <Typography.Text className={styles.scheduledPrice}>
          {formatPrice(item.amount)}
        </Typography.Text>
        {percentChange !== 0 && (
          <Typography.Text
            className={styles.scheduledChange}
            type={isIncrease ? "danger" : "success"}
          >
            ({isIncrease ? "+" : ""}
            {percentChange}%)
          </Typography.Text>
        )}
        <div className={styles.scheduledActions}>
          {onEdit && (
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(item.id)}
            />
          )}
          {onDelete && (
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(item.id)}
            />
          )}
        </div>
      </div>
      <Typography.Text className={styles.scheduledMeta}>
        Starts: {formatDateTime(item.startsAt)}
        {item.endsAt && ` — Ends: ${formatDateTime(item.endsAt)}`}
      </Typography.Text>
      {item.reason && (
        <Typography.Text className={styles.scheduledReason}>
          {item.reason}
        </Typography.Text>
      )}
    </div>
  );
};
