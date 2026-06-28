import type {
  IBundleGroup,
  BundleItem,
  PricingRuleTemplate,
} from "@/domains/promos/bundles/types";
import { BundleItemType, BundlePriceType } from "@/graphql/types";
import {
  PRICE_RULE_OPTIONS,
} from "@/domains/promos/bundles/types";

export const getItemImageUrl = (item: BundleItem): string | null => {
  if (item.featuredImage?.url) {
    return item.featuredImage.url;
  }
  if (item.itemType === BundleItemType.Variant && item.assignedVariant) {
    return item.assignedVariant.media?.[0]?.file?.url ?? null;
  }
  return null;
};

export const getItemName = (item: BundleItem): string => {
  if (item.title) return item.title;
  if (item.itemType === BundleItemType.Variant && item.assignedVariant) {
    return item.assignedVariant.title ?? "Variant";
  }
  if (item.assignedProduct) {
    return item.assignedProduct.title ?? "Product";
  }
  return "Item";
};

const isTemplate = (
  rule: BundleItem["pricingRule"],
): rule is PricingRuleTemplate => {
  return "id" in rule && "name" in rule;
};

export const getPriceRuleLabel = (
  rule: BundleItem["pricingRule"],
): string | null => {
  if (!rule) return null;
  const { priceType, priceValue } = rule;
  if (priceType === BundlePriceType.Base) return null;

  if (isTemplate(rule) && rule.name) return rule.name;

  const option = PRICE_RULE_OPTIONS.find((o) => o.value === priceType);
  if (!option) return null;

  if (option.requiresValue && priceValue != null) {
    return option.valueSuffix === "%"
      ? `${option.label} ${priceValue}%`
      : `${option.label} $${priceValue}`;
  }
  return option.label;
};

export const getPriceRuleColor = (priceType: BundlePriceType): string => {
  switch (priceType) {
    case BundlePriceType.DiscountPercent:
    case BundlePriceType.DiscountFixed:
    case BundlePriceType.Free:
      return "green";
    case BundlePriceType.Fixed:
      return "blue";
    default:
      return "default";
  }
};

export const getItemQtyLabel = (item: BundleItem): string | null => {
  const min = item.minQty;
  const max = item.maxQty;
  if (!min && !max) return null;
  if (min && max) return min === max ? `Qty: ${min}` : `Qty: ${min}–${max}`;
  if (min) return `Min: ${min}`;
  if (max) return `Max: ${max}`;
  return null;
};

export const getSelectionLabel = (group: IBundleGroup): string | null => {
  const min = group.minSelection;
  const max = group.maxSelection;
  if (min == null && max == null) return null;
  if (min != null && max != null) return min === max ? `[${min}]` : `[${min}–${max}]`;
  if (min != null) return `[${min}+]`;
  if (max != null) return `[1–${max}]`;
  return null;
};
