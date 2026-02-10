import { Typography, Tag, Tooltip, Flex } from "antd";
import { useStyles } from "../pricing-block.styles";

const NBSP = "\u00A0";

export interface ICurrentPriceColumnProps {
  price: number;
  compareAtPrice: number | null;
  formatPrice: (amount: number) => string;
}

export const CurrentPriceColumn = ({
  price,
  compareAtPrice,
  formatPrice,
}: ICurrentPriceColumnProps) => {
  const { styles } = useStyles();

  const saving =
    compareAtPrice && compareAtPrice > price ? compareAtPrice - price : null;
  const discountPercent =
    saving && compareAtPrice
      ? Math.round((saving / compareAtPrice) * 100)
      : null;

  return (
    <div className={styles.column}>
      <Typography.Text className={styles.sectionLabel}>
        Current price
      </Typography.Text>
      <Typography.Title level={2} className={styles.mainPrice}>
        {formatPrice(price)}
      </Typography.Title>
      <Flex align="center" gap={8}>
        {compareAtPrice && (
          <Typography.Text type="secondary">
            Compare at:{NBSP}
            <Typography.Text delete type="secondary">
              {formatPrice(compareAtPrice)}
            </Typography.Text>
          </Typography.Text>
        )}
        {discountPercent && (
          <Tag color="red" className={styles.discountTag}>
            -{discountPercent}%
          </Tag>
        )}
      </Flex>

      <Tooltip title="Price set manually by user">
        <Tag className={styles.sourceTag} color="blue" style={{ marginTop: 8 }}>
          Manual
        </Tag>
      </Tooltip>
    </div>
  );
};
