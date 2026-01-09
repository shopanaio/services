import { Button, Empty } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { Paper } from "../../../components/Paper";
import { PaperHeader } from "../../../components/PaperHeader";
import { ScheduledPriceItem } from "./ScheduledPriceItem";
import type { IScheduledPriceRecord } from "../types";
import { useStyles } from "../PriceHistoryModal.styles";

interface IScheduledSectionProps {
  scheduledPrices: IScheduledPriceRecord[];
  currentPrice: number;
  formatPrice: (amount: number) => string;
  onAdd?: () => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const ScheduledSection = ({
  scheduledPrices,
  currentPrice,
  formatPrice,
  onAdd,
  onEdit,
  onDelete,
}: IScheduledSectionProps) => {
  const { styles } = useStyles();

  return (
    <Paper className={styles.scheduledPaper}>
      <PaperHeader
        title="Scheduled"
        extra={
          onAdd && (
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={onAdd}
            >
              Add
            </Button>
          )
        }
      />
      {scheduledPrices.length > 0 ? (
        <div>
          {scheduledPrices.map((item) => (
            <ScheduledPriceItem
              key={item.id}
              item={item}
              currentPrice={currentPrice}
              formatPrice={formatPrice}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <Empty
          className={styles.emptyScheduled}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No scheduled price changes"
        />
      )}
    </Paper>
  );
};
