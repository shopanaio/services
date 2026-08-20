import type {
  ApiProductComponentAdjustmentPriceRule,
  ApiProductComponentGroup,
  ApiProductComponentItem,
  ApiProductComponentPriceRule,
} from "@/graphql/types";
import {
  PriceAdjustmentOperation,
  PriceAdjustmentValueType,
  ProductComponentItemType,
  ProductComponentPriceStrategy,
} from "@/graphql/types";

export const getItemImageUrl = (item: ApiProductComponentItem): string | null => {
  if (item.featuredImage?.url) return item.featuredImage.url;
  if (item.itemType === ProductComponentItemType.Variant) {
    return item.refVariant?.media?.[0]?.file?.url ?? null;
  }
  return item.refProduct?.media?.[0]?.file?.url ?? null;
};

export const getItemName = (item: ApiProductComponentItem): string =>
  item.title ?? item.refVariant?.title ?? item.refProduct?.title ?? "Item";

const getAmount = (rule: ApiProductComponentPriceRule): number | null =>
  "amounts" in rule
    ? Number((rule.amounts as Array<{ amountMinor: number }>)[0]?.amountMinor ?? 0)
    : null;

export const getPriceRuleLabel = (
  rule: ApiProductComponentPriceRule,
  templateName?: string,
): string | null => {
  if (templateName) return templateName;
  if (rule.strategy === ProductComponentPriceStrategy.Base) return null;
  if (rule.strategy === ProductComponentPriceStrategy.Free) return "Free";
  if (rule.strategy === ProductComponentPriceStrategy.Override) {
    return `Fixed price $${getAmount(rule) ?? 0}`;
  }

  const adjustment = rule as ApiProductComponentAdjustmentPriceRule;
  const direction =
    adjustment.operation === PriceAdjustmentOperation.Decrease ? "Discount" : "Markup";

  if (adjustment.valueType === PriceAdjustmentValueType.Percentage) {
    return `${direction} ${Number(adjustment.percentageBps ?? 0) / 100}%`;
  }
  return `${direction} $${getAmount(rule) ?? 0}`;
};

export const getPriceRuleColor = (strategy: ProductComponentPriceStrategy): string => {
  if (
    strategy === ProductComponentPriceStrategy.Free ||
    strategy === ProductComponentPriceStrategy.Adjustment
  ) {
    return "green";
  }
  if (strategy === ProductComponentPriceStrategy.Override) return "blue";
  return "default";
};

export const getItemQtyLabel = (item: ApiProductComponentItem): string | null => {
  const { minQty: min, maxQty: max } = item;
  if (!min && !max) return null;
  if (min && max) return min === max ? `Qty: ${min}` : `Qty: ${min}–${max}`;
  if (min) return `Min: ${min}`;
  if (max) return `Max: ${max}`;
  return null;
};

export const getSelectionLabel = (group: ApiProductComponentGroup): string | null => {
  const { minSelection: min, maxSelection: max } = group;
  if (min == null && max == null) return null;
  if (min != null && max != null) {
    return min === max ? `[${min}]` : `[${min}–${max}]`;
  }
  if (min != null) return `[${min}+]`;
  return `[1–${max}]`;
};
