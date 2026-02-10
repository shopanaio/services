import { Tag } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";

const useStyles = createStyles(() => ({
  tagSmall: {
    margin: 0,
    fontSize: 10,
    padding: "0 4px",
    lineHeight: "16px",
    border: "none",
  },
  tagDefault: {
    margin: 0,
    fontSize: 12,
    padding: "0 6px",
    lineHeight: "20px",
    border: "none",
  },
}));

interface IPriceChangeIndicatorProps {
  currentPrice: number;
  previousPrice: number | null;
  size?: "small" | "default";
}

export const PriceChangeIndicator = ({
  currentPrice,
  previousPrice,
  size = "default",
}: IPriceChangeIndicatorProps) => {
  const { styles } = useStyles();

  if (!previousPrice || previousPrice === currentPrice) {
    return null;
  }

  const diff = currentPrice - previousPrice;
  const percentChange = ((diff / previousPrice) * 100).toFixed(0);
  const isIncrease = diff > 0;

  return (
    <Tag
      color={isIncrease ? "error" : "success"}
      className={size === "small" ? styles.tagSmall : styles.tagDefault}
    >
      {isIncrease ? <ArrowUpOutlined /> : <ArrowDownOutlined />}{" "}
      {isIncrease ? "+" : ""}
      {percentChange}%
    </Tag>
  );
};
