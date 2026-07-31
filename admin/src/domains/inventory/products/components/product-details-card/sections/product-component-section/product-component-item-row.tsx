"use client";

import { Avatar, Tag, Typography } from "antd";
import { createStyles } from "antd-style";
import { LuImage as PictureOutlined } from "react-icons/lu";
import type {
  ApiFile,
  ApiProductComponentAdjustmentPriceRule,
  ApiProductComponentItem,
  ApiProductComponentOverridePriceRule,
  ApiProductComponentPriceRule,
} from "@/graphql/types";
import {
  PriceAdjustmentOperation,
  PriceAdjustmentValueType,
  ProductComponentPriceStrategy,
} from "@/graphql/types";

const useStyles = createStyles(({ token }) => ({
  row: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 0",
    borderTop: `1px solid ${token.colorBorderSecondary}`,
  },
  info: {
    display: "flex",
    flex: 1,
    minWidth: 0,
    flexDirection: "column",
  },
  name: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
}));

function getItemImage(item: ApiProductComponentItem): ApiFile | null {
  if (item.featuredImage) return item.featuredImage;

  const productMedia = item.refProduct?.media
    ?.slice()
    .sort((left, right) => left.sortIndex - right.sortIndex)[0];
  if (productMedia?.file) return productMedia.file;

  const variantMedia = item.refVariant?.media
    ?.slice()
    .sort((left, right) => left.sortIndex - right.sortIndex)[0];

  return variantMedia?.file ?? null;
}

function getItemName(item: ApiProductComponentItem) {
  return (
    item.title ??
    item.refProduct?.title ??
    item.refVariant?.title ??
    item.refVariant?.product?.title ??
    "Unavailable item"
  );
}

function getQuantityLabel(item: ApiProductComponentItem) {
  const minimum = item.minQty ?? 0;
  const maximum = item.maxQty;

  if (minimum === 0 && maximum == null) return null;
  if (maximum == null) return `Min ${minimum}`;
  if (minimum === maximum) return `Qty ${minimum}`;
  return `${minimum}–${maximum}`;
}

function formatAmount(amountMinor: bigint | number | string, currency: string) {
  const amount = Number(amountMinor) / 100;
  return `${amount.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })} ${currency}`;
}

function isAdjustmentPriceRule(
  rule: ApiProductComponentPriceRule,
): rule is ApiProductComponentAdjustmentPriceRule {
  return (
    "__typename" in rule &&
    rule.__typename === "ProductComponentAdjustmentPriceRule"
  );
}

function isOverridePriceRule(
  rule: ApiProductComponentPriceRule,
): rule is ApiProductComponentOverridePriceRule {
  return (
    "__typename" in rule &&
    rule.__typename === "ProductComponentOverridePriceRule"
  );
}

function getPriceRuleLabel(rule: ApiProductComponentPriceRule | null) {
  if (!rule || rule.strategy === ProductComponentPriceStrategy.Base) {
    return null;
  }
  if (rule.strategy === ProductComponentPriceStrategy.Free) return "Free";

  if (
    isAdjustmentPriceRule(rule) &&
    rule.valueType === PriceAdjustmentValueType.Percentage &&
    rule.percentageBps != null
  ) {
    const operation =
      rule.operation === PriceAdjustmentOperation.Decrease ? "−" : "+";
    return `${operation}${rule.percentageBps / 100}%`;
  }

  const amount =
    isAdjustmentPriceRule(rule) || isOverridePriceRule(rule)
      ? rule.amounts[0]
      : null;

  if (!amount) return rule.strategy;

  const formattedAmount = formatAmount(amount.amountMinor, amount.currency);
  if (isOverridePriceRule(rule)) {
    return formattedAmount;
  }

  const operation =
    isAdjustmentPriceRule(rule) &&
    rule.operation === PriceAdjustmentOperation.Decrease
      ? "−"
      : "+";
  return `${operation}${formattedAmount}`;
}

export const ProductComponentItemRow = ({
  item,
}: {
  item: ApiProductComponentItem;
}) => {
  const { styles } = useStyles();
  const image = getItemImage(item);
  const quantity = getQuantityLabel(item);
  const priceRule = item.priceRule ?? item.pricingTemplate?.priceRule ?? null;
  const priceLabel = getPriceRuleLabel(priceRule);

  return (
    <div className={styles.row}>
      <Avatar
        size={40}
        shape="square"
        src={image?.url}
        icon={!image ? <PictureOutlined /> : undefined}
      />
      <div className={styles.info}>
        <Typography.Text className={styles.name}>
          {getItemName(item)}
        </Typography.Text>
        {quantity ? (
          <Typography.Text type="secondary">{quantity}</Typography.Text>
        ) : null}
      </div>
      {!item.visible ? <Tag>Hidden</Tag> : null}
      {item.selected ? <Tag color="blue">Selected</Tag> : null}
      {priceLabel ? <Tag color="gold">{priceLabel}</Tag> : null}
    </div>
  );
};
