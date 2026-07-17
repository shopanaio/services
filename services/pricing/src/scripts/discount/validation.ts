import type { UserError } from "../../kernel/BaseScript.js";
import type { DiscountAggregate } from "../../repositories/DiscountRepository.js";

export function validateDiscountAggregate(
  aggregate: DiscountAggregate,
): UserError[] {
  const errors: UserError[] = [];
  const root = aggregate.discount;
  const rules = [
    aggregate.amountOff,
    aggregate.buyXGetY,
    aggregate.freeShipping,
  ].filter(Boolean);

  if (rules.length > 1) {
    errors.push({
      message: "Discount has more than one rule subtype",
      code: "INVALID_AGGREGATE",
    });
  }
  if (
    aggregate.amountOff &&
    root.kind !== "AMOUNT_OFF_PRODUCTS" &&
    root.kind !== "AMOUNT_OFF_ORDER"
  ) {
    errors.push({
      message: "Rule does not match discount kind",
      code: "RULE_KIND_MISMATCH",
    });
  }
  if (aggregate.buyXGetY && root.kind !== "BUY_X_GET_Y") {
    errors.push({
      message: "Rule does not match discount kind",
      code: "RULE_KIND_MISMATCH",
    });
  }
  if (aggregate.freeShipping && root.kind !== "FREE_SHIPPING") {
    errors.push({
      message: "Rule does not match discount kind",
      code: "RULE_KIND_MISMATCH",
    });
  }
  if (root.kind === "BUY_X_GET_Y" && aggregate.minimumRequirement) {
    errors.push({
      message: "Buy X Get Y discounts cannot have a separate minimum requirement",
      code: "MINIMUM_REQUIREMENT_NOT_ALLOWED",
    });
  }
  if (root.method === "AUTOMATIC" && aggregate.codes.length > 0) {
    errors.push({
      message: "Automatic discounts cannot have redeem codes",
      code: "CODES_NOT_ALLOWED",
    });
  }

  const aggregateUsage = aggregate.usageCounter
    ? aggregate.usageCounter.reservedCount +
      aggregate.usageCounter.committedCount -
      aggregate.usageCounter.reversedCount
    : 0n;
  if (root.usageLimit !== null && root.usageLimit < aggregateUsage) {
    errors.push({
      message: "Usage limit is lower than current reserved and consumed usage",
      code: "USAGE_LIMIT_BELOW_USAGE",
    });
  }
  for (const code of aggregate.codes) {
    const counter = aggregate.codeUsageCounters.find(
      (value) => value.codeId === code.id,
    );
    const usage = counter
      ? counter.reservedCount +
        counter.committedCount -
        counter.reversedCount
      : 0n;
    if (code.usageLimit !== null && code.usageLimit < usage) {
      errors.push({
        message: "Code usage limit is lower than current reserved and consumed usage",
        code: "USAGE_LIMIT_BELOW_USAGE",
      });
    }
  }

  const roles = new Set(aggregate.targetSelections.map((item) => item.role));
  for (const selection of aggregate.targetSelections) {
    const targets = aggregate.targets.filter(
      (target) =>
        target.role === selection.role &&
        target.targetType === selection.targetType,
    );
    if (selection.targetType === "ALL_PRODUCTS" && targets.length > 0) {
      errors.push({
        message: "ALL_PRODUCTS selections cannot contain target IDs",
        code: "INVALID_TARGET_SELECTION",
      });
    }
    if (selection.targetType !== "ALL_PRODUCTS" && targets.length === 0) {
      errors.push({
        message: "Specific target selections require at least one target ID",
        code: "INVALID_TARGET_SELECTION",
      });
    }
  }
  if (
    (root.kind === "AMOUNT_OFF_ORDER" || root.kind === "FREE_SHIPPING") &&
    roles.size > 0
  ) {
    errors.push({
      message: "Order and shipping discounts cannot have catalog targets",
      code: "TARGETS_NOT_ALLOWED",
    });
  }
  if (
    root.kind === "AMOUNT_OFF_PRODUCTS" &&
    [...roles].some((role) => role !== "BENEFIT")
  ) {
    errors.push({
      message: "Amount-off product discounts only support BENEFIT targets",
      code: "INVALID_TARGET_ROLE",
    });
  }

  if (aggregate.buyerContext) {
    const type = aggregate.buyerContext.contextType;
    if (
      type === "ALL" &&
      (aggregate.eligibleCustomers.length > 0 ||
        aggregate.eligibleSegments.length > 0)
    ) {
      errors.push({
        message: "ALL eligibility cannot contain customers or segments",
        code: "INVALID_ELIGIBILITY",
      });
    }
    if (
      type === "CUSTOMERS" &&
      (aggregate.eligibleCustomers.length === 0 ||
        aggregate.eligibleSegments.length > 0)
    ) {
      errors.push({
        message: "CUSTOMERS eligibility requires customers only",
        code: "INVALID_ELIGIBILITY",
      });
    }
    if (
      type === "SEGMENTS" &&
      (aggregate.eligibleSegments.length === 0 ||
        aggregate.eligibleCustomers.length > 0)
    ) {
      errors.push({
        message: "SEGMENTS eligibility requires segments only",
        code: "INVALID_ELIGIBILITY",
      });
    }
  }

  if (root.state !== "DRAFT") {
    if (rules.length !== 1) {
      errors.push({
        message: "A non-draft discount requires a complete rule",
        code: "RULE_REQUIRED",
      });
    }
    if (!aggregate.buyerContext) {
      errors.push({
        message: "A non-draft discount requires buyer eligibility",
        code: "ELIGIBILITY_REQUIRED",
      });
    }
    if (aggregate.channels.length === 0) {
      errors.push({
        message: "A non-draft discount requires at least one channel",
        code: "CHANNEL_REQUIRED",
      });
    }
    if (
      root.method === "CODE" &&
      !aggregate.codes.some((code) => code.status === "ACTIVE")
    ) {
      errors.push({
        message: "A non-draft code discount requires an active redeem code",
        code: "ACTIVE_CODE_REQUIRED",
      });
    }
    if (
      root.kind === "AMOUNT_OFF_PRODUCTS" &&
      (roles.size !== 1 || !roles.has("BENEFIT"))
    ) {
      errors.push({
        message: "Amount-off product discounts require BENEFIT targets",
        code: "TARGETS_REQUIRED",
      });
    }
    if (
      root.kind === "BUY_X_GET_Y" &&
      (roles.size !== 2 ||
        !roles.has("QUALIFIER") ||
        !roles.has("BENEFIT"))
    ) {
      errors.push({
        message: "Buy X Get Y discounts require QUALIFIER and BENEFIT targets",
        code: "TARGETS_REQUIRED",
      });
    }
  }
  return errors;
}
