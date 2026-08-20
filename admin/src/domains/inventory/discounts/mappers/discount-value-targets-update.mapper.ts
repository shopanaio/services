import type { ApiDiscount, ApiDiscountUpdateInput } from "@/graphql/types";
import {
  DiscountAllocationMethod,
  DiscountBenefitStrategy,
  DiscountKind,
  DiscountRequirementType,
  DiscountTargetRole,
  DiscountTargetType,
  PriceAdjustmentOperation,
  PriceAdjustmentValueType,
} from "@/graphql/types";

export interface DiscountTargetEditorItem {
  id: string;
  title: string;
}

export interface DiscountValueTargetsFormValues {
  valueType: PriceAdjustmentValueType;
  percentage: number | null;
  amount: string;
  allocationMethod: DiscountAllocationMethod;
  maximumDiscount: string;
  maximumShippingPrice: string;
  targetType: DiscountTargetType;
  targets: DiscountTargetEditorItem[];
  qualifierTargetType: DiscountTargetType;
  qualifierTargets: DiscountTargetEditorItem[];
  requirementType: DiscountRequirementType | null;
  minimumSubtotal: string;
  minimumQuantity: number | null;
  buyRequirementType: DiscountRequirementType;
  requiredSubtotal: string;
  requiredQuantity: number | null;
  benefitQuantity: number | null;
  benefitStrategy: DiscountBenefitStrategy;
  benefitValueType: PriceAdjustmentValueType;
  benefitPercentage: number | null;
  benefitAmount: string;
  usesPerOrderLimit: number | null;
}

function minorToMajor(value: number | null | undefined): string {
  if (value == null) return "";

  const amount = BigInt(value);
  const whole = amount / 100n;
  const fraction = (amount % 100n).toString().padStart(2, "0");

  return fraction === "00" ? whole.toString() : `${whole}.${fraction.replace(/0$/, "")}`;
}

function majorToMinor(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;

  const [whole, fraction = ""] = normalized.split(".");
  const amount = Number(BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")));

  return Number.isSafeInteger(amount) ? amount : null;
}

function isPositiveMoney(value: string): boolean {
  const amount = majorToMinor(value);
  return amount != null && amount > 0;
}

function getTargetTitle(
  target: ApiDiscount["targetSelections"][number]["targets"][number],
): string {
  const entity = target.target;
  if (!entity) return target.targetId;
  if (entity.__typename === "Product") return entity.title;
  if (entity.__typename === "Category") return entity.name;
  if (entity.__typename === "Variant") {
    return [entity.product.title, entity.handle].filter(Boolean).join(" / ");
  }
  return target.targetId;
}

function getSelection(discount: ApiDiscount, role: DiscountTargetRole) {
  return discount.targetSelections.find((selection) => selection.role === role) ?? null;
}

function mapTargets(
  selection: ApiDiscount["targetSelections"][number] | null,
): DiscountTargetEditorItem[] {
  return (
    selection?.targets.map((target) => ({
      id: target.targetId,
      title: getTargetTitle(target),
    })) ?? []
  );
}

export function createDiscountValueTargetsFormValues(
  discount: ApiDiscount,
): DiscountValueTargetsFormValues {
  const amountOff = discount.rule?.__typename === "DiscountAmountOffRule" ? discount.rule : null;
  const buyXGetY = discount.rule?.__typename === "DiscountBuyXGetYRule" ? discount.rule : null;
  const freeShipping =
    discount.rule?.__typename === "DiscountFreeShippingRule" ? discount.rule : null;
  const benefitSelection = getSelection(discount, DiscountTargetRole.Benefit);
  const qualifierSelection = getSelection(discount, DiscountTargetRole.Qualifier);
  const minimum = discount.minimumRequirement;

  return {
    valueType:
      amountOff?.valueType === PriceAdjustmentValueType.FixedAmount
        ? PriceAdjustmentValueType.FixedAmount
        : PriceAdjustmentValueType.Percentage,
    percentage: amountOff?.percentageBps == null ? null : amountOff.percentageBps / 100,
    amount: minorToMajor(amountOff?.amountMinor),
    allocationMethod: amountOff?.allocationMethod ?? DiscountAllocationMethod.Each,
    maximumDiscount: minorToMajor(amountOff?.maximumDiscountMinor),
    maximumShippingPrice: minorToMajor(freeShipping?.maximumShippingPriceMinor),
    targetType: benefitSelection?.targetType ?? DiscountTargetType.AllProducts,
    targets: mapTargets(benefitSelection),
    qualifierTargetType: qualifierSelection?.targetType ?? DiscountTargetType.AllProducts,
    qualifierTargets: mapTargets(qualifierSelection),
    requirementType: minimum?.requirementType ?? null,
    minimumSubtotal: minorToMajor(minimum?.subtotalMinor),
    minimumQuantity: minimum?.quantity ?? null,
    buyRequirementType: buyXGetY?.requirementType ?? DiscountRequirementType.Quantity,
    requiredSubtotal: minorToMajor(buyXGetY?.requiredSubtotalMinor),
    requiredQuantity: buyXGetY?.requiredQuantity ?? 1,
    benefitQuantity: buyXGetY?.benefitQuantity ?? 1,
    benefitStrategy: buyXGetY?.benefitStrategy ?? DiscountBenefitStrategy.Free,
    benefitValueType: buyXGetY?.benefitValueType ?? PriceAdjustmentValueType.Percentage,
    benefitPercentage:
      buyXGetY?.benefitPercentageBps == null ? null : buyXGetY.benefitPercentageBps / 100,
    benefitAmount: minorToMajor(buyXGetY?.benefitAmountMinor),
    usesPerOrderLimit: buyXGetY?.usesPerOrderLimit ?? null,
  };
}

function validateTargetSelection(
  targetType: DiscountTargetType,
  targets: DiscountTargetEditorItem[],
  label: string,
  errors: string[],
) {
  if (targetType !== DiscountTargetType.AllProducts && targets.length === 0) {
    errors.push(`Select at least one ${label} target.`);
  }
}

export function validateDiscountValueTargetsForm(
  discount: ApiDiscount,
  values: DiscountValueTargetsFormValues,
): string[] {
  const errors: string[] = [];

  if (
    discount.kind === DiscountKind.AmountOffProducts ||
    discount.kind === DiscountKind.AmountOffOrder
  ) {
    if (
      values.valueType === PriceAdjustmentValueType.Percentage &&
      (values.percentage == null || values.percentage <= 0 || values.percentage > 100)
    ) {
      errors.push("Percentage must be greater than 0 and no more than 100.");
    }
    if (
      values.valueType === PriceAdjustmentValueType.FixedAmount &&
      !isPositiveMoney(values.amount)
    ) {
      errors.push("Fixed amount must be a positive amount.");
    }
    if (values.maximumDiscount && !isPositiveMoney(values.maximumDiscount)) {
      errors.push("Maximum discount must be a positive amount.");
    }
  }

  if (discount.kind === DiscountKind.AmountOffProducts) {
    validateTargetSelection(values.targetType, values.targets, "benefit", errors);
  }

  if (discount.kind === DiscountKind.FreeShipping) {
    if (values.maximumShippingPrice && !isPositiveMoney(values.maximumShippingPrice)) {
      errors.push("Maximum shipping price must be a positive amount.");
    }
  }

  if (discount.kind === DiscountKind.BuyXGetY) {
    if (
      values.buyRequirementType === DiscountRequirementType.Quantity &&
      (!values.requiredQuantity ||
        !Number.isSafeInteger(values.requiredQuantity) ||
        values.requiredQuantity < 1)
    ) {
      errors.push("Required quantity must be a positive whole number.");
    }
    if (
      values.buyRequirementType === DiscountRequirementType.Subtotal &&
      !isPositiveMoney(values.requiredSubtotal)
    ) {
      errors.push("Required subtotal must be a positive amount.");
    }
    if (
      !values.benefitQuantity ||
      !Number.isSafeInteger(values.benefitQuantity) ||
      values.benefitQuantity < 1
    ) {
      errors.push("Benefit quantity must be a positive whole number.");
    }
    if (
      values.benefitStrategy === DiscountBenefitStrategy.Adjustment &&
      values.benefitValueType === PriceAdjustmentValueType.Percentage &&
      (values.benefitPercentage == null ||
        values.benefitPercentage <= 0 ||
        values.benefitPercentage > 100)
    ) {
      errors.push("Benefit percentage must be greater than 0 and no more than 100.");
    }
    if (
      values.benefitStrategy === DiscountBenefitStrategy.Adjustment &&
      values.benefitValueType === PriceAdjustmentValueType.FixedAmount &&
      !isPositiveMoney(values.benefitAmount)
    ) {
      errors.push("Benefit amount must be a positive amount.");
    }
    if (
      values.usesPerOrderLimit != null &&
      (!Number.isSafeInteger(values.usesPerOrderLimit) || values.usesPerOrderLimit < 1)
    ) {
      errors.push("Uses per order limit must be a positive whole number.");
    }
    validateTargetSelection(
      values.qualifierTargetType,
      values.qualifierTargets,
      "qualifier",
      errors,
    );
    validateTargetSelection(values.targetType, values.targets, "benefit", errors);
  }

  if (
    discount.kind !== DiscountKind.BuyXGetY &&
    values.requirementType === DiscountRequirementType.Subtotal &&
    !isPositiveMoney(values.minimumSubtotal)
  ) {
    errors.push("Minimum subtotal must be a positive amount.");
  }
  if (
    discount.kind !== DiscountKind.BuyXGetY &&
    values.requirementType === DiscountRequirementType.Quantity &&
    (!values.minimumQuantity ||
      !Number.isSafeInteger(values.minimumQuantity) ||
      values.minimumQuantity < 1)
  ) {
    errors.push("Minimum quantity must be a positive whole number.");
  }

  return errors;
}

function buildTargetSelection(
  role: DiscountTargetRole,
  targetType: DiscountTargetType,
  targets: DiscountTargetEditorItem[],
) {
  return {
    role,
    targetType,
    targetIds:
      targetType === DiscountTargetType.AllProducts ? [] : targets.map((target) => target.id),
  };
}

export function buildDiscountValueTargetsUpdateInput(
  discount: ApiDiscount,
  values: DiscountValueTargetsFormValues,
): ApiDiscountUpdateInput {
  const operations: ApiDiscountUpdateInput = {};

  if (
    discount.kind === DiscountKind.AmountOffProducts ||
    discount.kind === DiscountKind.AmountOffOrder
  ) {
    operations.rule = {
      amountOff: {
        operation: PriceAdjustmentOperation.Decrease,
        valueType: values.valueType,
        allocationMethod: values.allocationMethod,
        percentageBps:
          values.valueType === PriceAdjustmentValueType.Percentage
            ? Math.round((values.percentage ?? 0) * 100)
            : null,
        amountMinor:
          values.valueType === PriceAdjustmentValueType.FixedAmount
            ? majorToMinor(values.amount)
            : null,
        maximumDiscountMinor: values.maximumDiscount ? majorToMinor(values.maximumDiscount) : null,
      },
    };
    operations.targetSelections =
      discount.kind === DiscountKind.AmountOffProducts
        ? [buildTargetSelection(DiscountTargetRole.Benefit, values.targetType, values.targets)]
        : [];
  } else if (discount.kind === DiscountKind.FreeShipping) {
    operations.rule = {
      freeShipping: {
        maximumShippingPriceMinor: values.maximumShippingPrice
          ? majorToMinor(values.maximumShippingPrice)
          : null,
      },
    };
    operations.targetSelections = [];
  } else {
    operations.rule = {
      buyXGetY: {
        requirementType: values.buyRequirementType,
        requiredQuantity:
          values.buyRequirementType === DiscountRequirementType.Quantity
            ? values.requiredQuantity
            : null,
        requiredSubtotalMinor:
          values.buyRequirementType === DiscountRequirementType.Subtotal
            ? majorToMinor(values.requiredSubtotal)
            : null,
        benefitQuantity: values.benefitQuantity ?? 1,
        benefitStrategy: values.benefitStrategy,
        benefitOperation:
          values.benefitStrategy === DiscountBenefitStrategy.Adjustment
            ? PriceAdjustmentOperation.Decrease
            : null,
        benefitValueType:
          values.benefitStrategy === DiscountBenefitStrategy.Adjustment
            ? values.benefitValueType
            : null,
        benefitPercentageBps:
          values.benefitStrategy === DiscountBenefitStrategy.Adjustment &&
          values.benefitValueType === PriceAdjustmentValueType.Percentage
            ? Math.round((values.benefitPercentage ?? 0) * 100)
            : null,
        benefitAmountMinor:
          values.benefitStrategy === DiscountBenefitStrategy.Adjustment &&
          values.benefitValueType === PriceAdjustmentValueType.FixedAmount
            ? majorToMinor(values.benefitAmount)
            : null,
        usesPerOrderLimit: values.usesPerOrderLimit,
      },
    };
    operations.targetSelections = [
      buildTargetSelection(
        DiscountTargetRole.Qualifier,
        values.qualifierTargetType,
        values.qualifierTargets,
      ),
      buildTargetSelection(DiscountTargetRole.Benefit, values.targetType, values.targets),
    ];
  }

  if (discount.kind !== DiscountKind.BuyXGetY) {
    operations.minimumRequirement = {
      requirement:
        values.requirementType == null
          ? null
          : {
              requirementType: values.requirementType,
              subtotalMinor:
                values.requirementType === DiscountRequirementType.Subtotal
                  ? majorToMinor(values.minimumSubtotal)
                  : null,
              quantity:
                values.requirementType === DiscountRequirementType.Quantity
                  ? values.minimumQuantity
                  : null,
            },
    };
  }

  return operations;
}
