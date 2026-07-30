import type { UserError } from "../../kernel/BaseScript.js";
import type {
  DiscountAggregate,
  DiscountRuleWriteInput,
} from "../../repositories/DiscountRepository.js";
import type {
  DiscountUpdateRuleParams,
  DiscountUpdateRuleResult,
} from "./dto/index.js";
import {
  parseNonNegativeBigInt,
  parsePositiveBigInt,
} from "./shared.js";
import { BaseDiscountUpdateScript } from "./BaseDiscountUpdateScript.js";
import { sectionErrors, sectionSuccess } from "./types.js";

export class DiscountUpdateRuleScript extends BaseDiscountUpdateScript<DiscountUpdateRuleParams> {
  protected async update(
    aggregate: DiscountAggregate,
    params: DiscountUpdateRuleParams,
  ): Promise<DiscountUpdateRuleResult> {
    const mapped = mapRuleInput(aggregate.discount.kind, params.rule);
    if (mapped.errors.length > 0 || !mapped.value) {
      return sectionErrors(mapped.errors);
    }
    await this.repository.discount.replaceRule(
      aggregate.discount.id,
      mapped.value,
    );
    return sectionSuccess();
  }
}

function mapRuleInput(
  kind: DiscountAggregate["discount"]["kind"],
  input: DiscountUpdateRuleParams["rule"],
): { value?: DiscountRuleWriteInput; errors: UserError[] } {
  const errors: UserError[] = [];
  const supplied = [
    input.amountOff,
    input.buyXGetY,
    input.freeShipping,
  ].filter((value) => value != null);
  if (supplied.length !== 1) {
    return {
      errors: [
        {
          message: "Exactly one rule subtype must be supplied",
          code: "INVALID_RULE",
        },
      ],
    };
  }

  if (input.amountOff != null) {
    if (kind !== "AMOUNT_OFF_PRODUCTS" && kind !== "AMOUNT_OFF_ORDER") {
      errors.push({
        message: "Amount-off rule does not match the discount kind",
        code: "RULE_KIND_MISMATCH",
        field: ["amountOff"],
      });
    }
    const amountMinor = parsePositiveBigInt(
      input.amountOff.amountMinor,
      ["amountOff", "amountMinor"],
      errors,
    );
    const maximumDiscountMinor = parsePositiveBigInt(
      input.amountOff.maximumDiscountMinor,
      ["amountOff", "maximumDiscountMinor"],
      errors,
    );
    const percentageBps = input.amountOff.percentageBps ?? null;
    if (input.amountOff.operation !== "DECREASE") {
      errors.push({
        message: "Discount amount-off rules must decrease the base price",
        code: "INVALID_RULE_VALUE",
        field: ["amountOff", "operation"],
      });
    }
    if (
      input.amountOff.valueType === "PERCENTAGE" &&
      (!percentageBps ||
        percentageBps < 1 ||
        percentageBps > 10_000 ||
        amountMinor !== null)
    ) {
      errors.push({
        message:
          "Percentage rules require percentageBps from 1 to 10000 and no amountMinor",
        code: "INVALID_RULE_VALUE",
        field: ["amountOff"],
      });
    }
    if (
      input.amountOff.valueType === "FIXED_AMOUNT" &&
      (amountMinor === null || percentageBps !== null)
    ) {
      errors.push({
        message:
          "Fixed-amount rules require amountMinor and no percentageBps",
        code: "INVALID_RULE_VALUE",
        field: ["amountOff"],
      });
    }
    return {
      value: {
        type: "amountOff",
        operation: "DECREASE",
        valueType: input.amountOff.valueType,
        percentageBps,
        amountMinor,
        allocationMethod: input.amountOff.allocationMethod ?? "ACROSS",
        maximumDiscountMinor,
      },
      errors,
    };
  }

  if (input.buyXGetY != null) {
    if (kind !== "BUY_X_GET_Y") {
      errors.push({
        message: "Buy X Get Y rule does not match the discount kind",
        code: "RULE_KIND_MISMATCH",
        field: ["buyXGetY"],
      });
    }
    const requiredSubtotalMinor = parsePositiveBigInt(
      input.buyXGetY.requiredSubtotalMinor,
      ["buyXGetY", "requiredSubtotalMinor"],
      errors,
    );
    const benefitAmountMinor = parsePositiveBigInt(
      input.buyXGetY.benefitAmountMinor,
      ["buyXGetY", "benefitAmountMinor"],
      errors,
    );
    const requiredQuantity = input.buyXGetY.requiredQuantity ?? null;
    const benefitPercentageBps =
      input.buyXGetY.benefitPercentageBps ?? null;
    const benefitOperation = input.buyXGetY.benefitOperation ?? null;
    const benefitValueType = input.buyXGetY.benefitValueType ?? null;
    if (
      input.buyXGetY.requirementType === "QUANTITY" &&
      (!requiredQuantity ||
        requiredQuantity < 1 ||
        requiredSubtotalMinor !== null)
    ) {
      errors.push({
        message:
          "Quantity requirements require a positive quantity and no subtotal",
        code: "INVALID_RULE_REQUIREMENT",
        field: ["buyXGetY"],
      });
    }
    if (
      input.buyXGetY.requirementType === "SUBTOTAL" &&
      (requiredSubtotalMinor === null || requiredQuantity !== null)
    ) {
      errors.push({
        message:
          "Subtotal requirements require a positive subtotal and no quantity",
        code: "INVALID_RULE_REQUIREMENT",
        field: ["buyXGetY"],
      });
    }
    if (
      !Number.isSafeInteger(input.buyXGetY.benefitQuantity) ||
      input.buyXGetY.benefitQuantity < 1
    ) {
      errors.push({
        message: "Benefit quantity must be a positive integer",
        code: "INVALID_RULE_VALUE",
        field: ["buyXGetY", "benefitQuantity"],
      });
    }
    if (
      input.buyXGetY.benefitStrategy === "ADJUSTMENT" &&
      benefitValueType === "PERCENTAGE" &&
      (!benefitPercentageBps ||
        benefitPercentageBps < 1 ||
        benefitPercentageBps > 10_000 ||
        benefitAmountMinor !== null ||
        benefitOperation !== "DECREASE")
    ) {
      errors.push({
        message:
          "Percentage benefits require benefitPercentageBps from 1 to 10000 and no amount",
        code: "INVALID_RULE_VALUE",
        field: ["buyXGetY"],
      });
    }
    if (
      input.buyXGetY.benefitStrategy === "ADJUSTMENT" &&
      benefitValueType === "FIXED_AMOUNT" &&
      (benefitAmountMinor === null ||
        benefitPercentageBps !== null ||
        benefitOperation !== "DECREASE")
    ) {
      errors.push({
        message:
          "Fixed benefits require benefitAmountMinor and no percentage",
        code: "INVALID_RULE_VALUE",
        field: ["buyXGetY"],
      });
    }
    if (
      input.buyXGetY.benefitStrategy === "ADJUSTMENT" &&
      benefitValueType === null
    ) {
      errors.push({
        message: "Adjustment benefits require a value type",
        code: "INVALID_RULE_VALUE",
        field: ["buyXGetY", "benefitValueType"],
      });
    }
    if (
      input.buyXGetY.benefitStrategy === "FREE" &&
      (benefitAmountMinor !== null ||
        benefitPercentageBps !== null ||
        benefitOperation !== null ||
        benefitValueType !== null)
    ) {
      errors.push({
        message: "Free benefits cannot include an amount or percentage",
        code: "INVALID_RULE_VALUE",
        field: ["buyXGetY"],
      });
    }
    const usesPerOrderLimit = input.buyXGetY.usesPerOrderLimit ?? null;
    if (
      usesPerOrderLimit !== null &&
      (!Number.isSafeInteger(usesPerOrderLimit) || usesPerOrderLimit < 1)
    ) {
      errors.push({
        message: "Uses-per-order limit must be a positive integer",
        code: "INVALID_RULE_VALUE",
        field: ["buyXGetY", "usesPerOrderLimit"],
      });
    }
    return {
      value: {
        type: "buyXGetY",
        requirementType: input.buyXGetY.requirementType,
        requiredQuantity,
        requiredSubtotalMinor,
        benefitQuantity: input.buyXGetY.benefitQuantity,
        benefitStrategy: input.buyXGetY.benefitStrategy,
        benefitOperation:
          input.buyXGetY.benefitStrategy === "ADJUSTMENT"
            ? "DECREASE"
            : null,
        benefitValueType:
          input.buyXGetY.benefitStrategy === "ADJUSTMENT"
            ? benefitValueType
            : null,
        benefitPercentageBps,
        benefitAmountMinor,
        usesPerOrderLimit,
      },
      errors,
    };
  }

  if (kind !== "FREE_SHIPPING") {
    errors.push({
      message: "Free-shipping rule does not match the discount kind",
      code: "RULE_KIND_MISMATCH",
      field: ["freeShipping"],
    });
  }
  const maximumShippingPriceMinor = parseNonNegativeBigInt(
    input.freeShipping!.maximumShippingPriceMinor,
    ["freeShipping", "maximumShippingPriceMinor"],
    errors,
  );
  return {
    value: { type: "freeShipping", maximumShippingPriceMinor },
    errors,
  };
}
