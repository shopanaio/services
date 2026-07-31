"use client";

import { Typography, Avatar, Tag } from "antd";
import { LuImage as PictureOutlined } from "react-icons/lu";
import type { ApiProductComponentItem } from "@/graphql/types";
import {
  getItemImageUrl,
  getItemName,
  getItemQtyLabel,
  getPriceRuleLabel,
  getPriceRuleColor,
} from "../helpers";
import { useStyles } from "../styles";

interface IComponentItemRowProps {
  item: ApiProductComponentItem;
}

export const ComponentItemRow = ({ item }: IComponentItemRowProps) => {
  const { styles } = useStyles();
  const imgUrl = getItemImageUrl(item);
  const priceRule = item.pricingTemplate?.priceRule ?? item.priceRule;
  const priceLabel = priceRule
    ? getPriceRuleLabel(priceRule, item.pricingTemplate?.name)
    : null;
  const qtyLabel = getItemQtyLabel(item);

  return (
    <div className={styles.itemRow}>
      <Avatar
        size={40}
        shape="square"
        src={imgUrl}
        icon={!imgUrl ? <PictureOutlined /> : undefined}
        className={!imgUrl ? styles.avatarPlaceholder : undefined}
      />
      <div className={styles.itemInfo}>
        <span className={styles.itemName}>{getItemName(item)}</span>
        {qtyLabel && (
          <Typography.Text type="secondary" className={styles.itemQty}>
            {qtyLabel}
          </Typography.Text>
        )}
      </div>
      {priceLabel && (
        <Tag
          color={getPriceRuleColor(priceRule!.strategy)}
          className={styles.itemTag}
        >
          {priceLabel}
        </Tag>
      )}
    </div>
  );
};
