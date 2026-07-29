import type {
  ApiDiscount,
  ApiDiscountUpdateInput,
} from "@/graphql/types";
import {
  DiscountAllocationMethod,
  DiscountRequirementType,
  DiscountTargetRole,
  DiscountTargetType,
  DiscountValueType,
} from "@/graphql/types";

export interface DiscountTargetEditorItem {
  id: string;
  title: string;
}

export interface DiscountValueTargetsFormValues {
  valueType: DiscountValueType.Percentage | DiscountValueType.FixedAmount;
  percentage: number | null;
  amount: string;
  allocationMethod: DiscountAllocationMethod;
  maximumDiscount: string;
  targetType: DiscountTargetType;
  targets: DiscountTargetEditorItem[];
  requirementType: DiscountRequirementType | null;
  minimumSubtotal: string;
  minimumQuantity: number | null;
}

function minorToMajor(value: number | null | undefined): string {
  if (value == null) return "";

  const amount = BigInt(value);
  const whole = amount / 100n;
  const fraction = (amount % 100n).toString().padStart(2, "0");

  return fraction === "00"
    ? whole.toString()
    : `${whole}.${fraction.replace(/0$/, "")}`;
}

function majorToMinor(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;

  const [whole, fraction = ""] = normalized.split(".");
  const amount = Number(
    BigInt(whole) * 100n +
      BigInt(fraction.padEnd(2, "0")),
  );

  return Number.isSafeInteger(amount) ? amount : null;
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

export function createDiscountValueTargetsFormValues(
  discount: ApiDiscount,
): DiscountValueTargetsFormValues {
  const rule =
    discount.rule?.__typename === "DiscountAmountOffRule"
      ? discount.rule
      : null;
  const selection =
    discount.targetSelections.find(
      (item) => item.role === DiscountTargetRole.Benefit,
    ) ?? null;
  const minimum = discount.minimumRequirement;

  return {
    valueType:
      rule?.valueType === DiscountValueType.FixedAmount
        ? DiscountValueType.FixedAmount
        : DiscountValueType.Percentage,
    percentage:
      rule?.percentageBps == null ? null : rule.percentageBps / 100,
    amount: minorToMajor(rule?.amountMinor),
    allocationMethod:
      rule?.allocationMethod ?? DiscountAllocationMethod.Each,
    maximumDiscount: minorToMajor(rule?.maximumDiscountMinor),
    targetType: selection?.targetType ?? DiscountTargetType.AllProducts,
    targets:
      selection?.targets.map((target) => ({
        id: target.targetId,
        title: getTargetTitle(target),
      })) ?? [],
    requirementType: minimum?.requirementType ?? null,
    minimumSubtotal: minorToMajor(minimum?.subtotalMinor),
    minimumQuantity: minimum?.quantity ?? null,
  };
}

export function validateDiscountValueTargetsForm(
  values: DiscountValueTargetsFormValues,
): string[] {
  const errors: string[] = [];

  if (
    values.valueType === DiscountValueType.Percentage &&
    (values.percentage == null ||
      values.percentage <= 0 ||
      values.percentage > 100)
  ) {
    errors.push("Percentage must be greater than 0 and no more than 100.");
  }

  if (
    values.valueType === DiscountValueType.FixedAmount &&
    (!majorToMinor(values.amount) || majorToMinor(values.amount) === 0)
  ) {
    errors.push("Fixed amount must be a positive amount.");
  }

  if (
    values.maximumDiscount &&
    (!majorToMinor(values.maximumDiscount) ||
      majorToMinor(values.maximumDiscount) === 0)
  ) {
    errors.push("Maximum discount must be a positive amount.");
  }

  if (
    values.targetType !== DiscountTargetType.AllProducts &&
    values.targets.length === 0
  ) {
    errors.push("Select at least one catalog target.");
  }

  if (
    values.requirementType === DiscountRequirementType.Subtotal &&
    (!majorToMinor(values.minimumSubtotal) ||
      majorToMinor(values.minimumSubtotal) === 0)
  ) {
    errors.push("Minimum subtotal must be a positive amount.");
  }

  if (
    values.requirementType === DiscountRequirementType.Quantity &&
    (!values.minimumQuantity ||
      !Number.isSafeInteger(values.minimumQuantity) ||
      values.minimumQuantity < 1)
  ) {
    errors.push("Minimum quantity must be a positive whole number.");
  }

  return errors;
}

export function buildDiscountValueTargetsUpdateInput(
  values: DiscountValueTargetsFormValues,
): ApiDiscountUpdateInput {
  const maximumDiscountMinor = values.maximumDiscount
    ? majorToMinor(values.maximumDiscount)
    : null;

  return {
    rule: {
      amountOff: {
        valueType: values.valueType,
        allocationMethod: values.allocationMethod,
        percentageBps:
          values.valueType === DiscountValueType.Percentage
            ? Math.round((values.percentage ?? 0) * 100)
            : null,
        amountMinor:
          values.valueType === DiscountValueType.FixedAmount
            ? majorToMinor(values.amount)
            : null,
        maximumDiscountMinor,
      },
    },
    targetSelections: [
      {
        role: DiscountTargetRole.Benefit,
        targetType: values.targetType,
        targetIds:
          values.targetType === DiscountTargetType.AllProducts
            ? []
            : values.targets.map((target) => target.id),
      },
    ],
    minimumRequirement: {
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
    },
  };
}
