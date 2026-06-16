"use client";

import { Typography, Avatar, Tag } from "antd";
import { PictureOutlined } from "@ant-design/icons";
import type { BundleItem } from "@/domains/promos/bundles/types";
import {
  getItemImageUrl,
  getItemName,
  getItemQtyLabel,
  getPriceRuleLabel,
  getPriceRuleColor,
} from "../helpers";
import { useStyles } from "../styles";

interface IBundleItemRowProps {
  item: BundleItem;
}

export const BundleItemRow = ({ item }: IBundleItemRowProps) => {
  const { styles } = useStyles();
  const imgUrl = getItemImageUrl(item);
  const priceLabel = item.pricingRule ? getPriceRuleLabel(item.pricingRule) : null;
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
          color={getPriceRuleColor(item.pricingRule!.priceType)}
          className={styles.itemTag}
        >
          {priceLabel}
        </Tag>
      )}
    </div>
  );
};
