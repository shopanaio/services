import type {
  ApiProductComponentAdjustmentPriceRule,
  ApiProductComponentBasePriceRule,
  ApiProductComponentFreePriceRule,
  ApiProductComponentOverridePriceRule,
  ApiProductComponentPriceRule,
} from "@/graphql/types";
import {
  CurrencyCode,
  PriceAdjustmentOperation,
  PriceAdjustmentValueType,
  ProductComponentPriceStrategy,
} from "@/graphql/types";
import { ComponentPriceType } from "../components/product-details-card/components-ui/types";

export interface EditorPriceRule {
  priceType: ComponentPriceType;
  priceValue: number | null;
}

const getRuleAmounts = (
  rule: ApiProductComponentPriceRule,
): Array<{ amountMinor: number }> =>
  "amounts" in rule
    ? (rule.amounts as Array<{ amountMinor: number }>)
    : [];

export const toEditorPriceRule = (
  rule: ApiProductComponentPriceRule | null | undefined,
): EditorPriceRule => {
  if (!rule || rule.strategy === ProductComponentPriceStrategy.Base) {
    return { priceType: ComponentPriceType.Base, priceValue: null };
  }
  if (rule.strategy === ProductComponentPriceStrategy.Free) {
    return { priceType: ComponentPriceType.Free, priceValue: null };
  }
  if (rule.strategy === ProductComponentPriceStrategy.Override) {
    return {
      priceType: ComponentPriceType.Fixed,
      priceValue: Number(getRuleAmounts(rule)[0]?.amountMinor ?? 0),
    };
  }

  const adjustmentRule = rule as ApiProductComponentAdjustmentPriceRule;
  if (adjustmentRule.valueType === PriceAdjustmentValueType.Percentage) {
    return {
      priceType:
        adjustmentRule.operation === PriceAdjustmentOperation.Decrease
          ? ComponentPriceType.DiscountPercent
          : ComponentPriceType.MarkupPercent,
      priceValue: Number(adjustmentRule.percentageBps ?? 0) / 100,
    };
  }

  const amount = Number(getRuleAmounts(rule)[0]?.amountMinor ?? 0);
  return {
    priceType:
      adjustmentRule.operation === PriceAdjustmentOperation.Decrease
        ? ComponentPriceType.DiscountFixed
        : ComponentPriceType.MarkupFixed,
    priceValue: amount,
  };
};

export const toApiPriceRule = (
  value: EditorPriceRule,
  id: string,
):
  | ApiProductComponentBasePriceRule
  | ApiProductComponentFreePriceRule
  | ApiProductComponentOverridePriceRule
  | ApiProductComponentAdjustmentPriceRule => {
  if (value.priceType === ComponentPriceType.Base) {
    return { __typename: "ProductComponentBasePriceRule", id, strategy: ProductComponentPriceStrategy.Base };
  }
  if (value.priceType === ComponentPriceType.Free) {
    return { __typename: "ProductComponentFreePriceRule", id, strategy: ProductComponentPriceStrategy.Free };
  }
  if (value.priceType === ComponentPriceType.Fixed) {
    return {
      __typename: "ProductComponentOverridePriceRule",
      id,
      strategy: ProductComponentPriceStrategy.Override,
      amounts: [{ __typename: "ProductComponentPriceRuleAmount", currency: CurrencyCode.Usd, amountMinor: value.priceValue ?? 0 }],
    };
  }
  const percentage =
    value.priceType === ComponentPriceType.DiscountPercent ||
    value.priceType === ComponentPriceType.MarkupPercent;
  const decrease =
    value.priceType === ComponentPriceType.DiscountPercent ||
    value.priceType === ComponentPriceType.DiscountFixed;
  return {
    __typename: "ProductComponentAdjustmentPriceRule",
    id,
    strategy: ProductComponentPriceStrategy.Adjustment,
    operation: decrease ? PriceAdjustmentOperation.Decrease : PriceAdjustmentOperation.Increase,
    valueType: percentage ? PriceAdjustmentValueType.Percentage : PriceAdjustmentValueType.FixedAmount,
    percentageBps: percentage ? Math.round((value.priceValue ?? 0) * 100) : null,
    amounts: percentage ? [] : [{ __typename: "ProductComponentPriceRuleAmount", currency: CurrencyCode.Usd, amountMinor: value.priceValue ?? 0 }],
  };
};
