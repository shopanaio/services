import { Button, Typography } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import { useStyles } from "./product-content-empty-state.styles";

interface IProductContentEmptyStateProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export const ProductContentEmptyState = ({
  title,
  description,
  actionLabel,
  onAction,
}: IProductContentEmptyStateProps) => {
  const { styles } = useStyles();

  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <FileTextOutlined />
      </div>
      <div className={styles.emptyContent}>
        <Typography.Title level={5} className={styles.emptyTitle}>
          {title}
        </Typography.Title>
        <Typography.Text type="secondary" className={styles.emptyText}>
          {description}
        </Typography.Text>
      </div>
      <Button type="primary" onClick={onAction} className={styles.emptyAction}>
        {actionLabel}
      </Button>
    </div>
  );
};
