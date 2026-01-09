import { Typography, Flex, Tag } from "antd";
import { createStyles } from "antd-style";
import { formatPrice } from "../utils";

const useStyles = createStyles(() => ({
  tagSmall: {
    margin: 0,
    fontSize: 10,
    padding: "0 4px",
    lineHeight: "16px",
    fontWeight: 600,
  },
  tagDefault: {
    margin: 0,
    fontSize: 11,
    padding: "0 6px",
    lineHeight: "18px",
    fontWeight: 600,
  },
  savingSmall: {
    fontSize: 10,
  },
  savingDefault: {
    fontSize: 11,
  },
}));

interface IDiscountBadgeProps {
  price: number;
  compareAtPrice: number;
  size?: "small" | "default";
  showSaving?: boolean;
}

export const DiscountBadge = ({
  price,
  compareAtPrice,
  size = "default",
  showSaving = true,
}: IDiscountBadgeProps) => {
  const { styles } = useStyles();

  if (!compareAtPrice || compareAtPrice <= price) {
    return null;
  }

  const saving = compareAtPrice - price;
  const discountPercent = Math.round((saving / compareAtPrice) * 100);

  return (
    <Flex align="center" gap="small">
      <Tag
        color="red"
        className={size === "small" ? styles.tagSmall : styles.tagDefault}
        variant="outlined"
      >
        -{discountPercent}%
      </Tag>
      {showSaving && (
        <Typography.Text
          type="success"
          className={
            size === "small" ? styles.savingSmall : styles.savingDefault
          }
        >
          Save {formatPrice(saving)}
        </Typography.Text>
      )}
    </Flex>
  );
};
