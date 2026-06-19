import { Typography, Tag, Tooltip, Flex } from "antd";
import { useStyles } from "../pricing-block.styles";
import type { ApiVariantPrice } from "@/graphql/types";
import {
  formatPrice,
  useVariantPrice,
} from "../../../utils/price-formatting";

const NBSP = "\u00A0";

export interface ICurrentPriceColumnProps {
  price: ApiVariantPrice | null;
}

export const CurrentPriceColumn = ({ price }: ICurrentPriceColumnProps) => {
  const { styles } = useStyles();
  const formattedPrice = useVariantPrice(price);

  const amountMinor = price?.amountMinor ?? 0;
  const compareAtPrice = price?.compareAtMinor ?? null;
  const saving =
    compareAtPrice && compareAtPrice > amountMinor
      ? compareAtPrice - amountMinor
      : null;
  const discountPercent =
    saving && compareAtPrice
      ? Math.round((saving / compareAtPrice) * 100)
      : null;

  return (
    <div className={styles.column}>
      <Typography.Text className={styles.sectionLabel}>
        Current price
      </Typography.Text>
      <Typography.Title
        level={2}
        className={styles.mainPrice}
        data-testid="pricing-widget-current-price"
      >
        {formattedPrice}
      </Typography.Title>
      <Flex align="center" gap={8}>
        {compareAtPrice && price && (
          <Typography.Text type="secondary">
            Compare at:{NBSP}
            <Typography.Text delete type="secondary">
              {formatPrice(compareAtPrice, price.currency)}
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
