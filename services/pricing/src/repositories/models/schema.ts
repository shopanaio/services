import { pgSchema } from "drizzle-orm/pg-core";
import { CURRENCY_CODES } from "@shopana/shared-references";

export const pricingSchema = pgSchema("pricing");

export const currencyCodeEnum = pricingSchema.enum(
  "currency_code",
  CURRENCY_CODES as [string, ...string[]],
);

export const discountMethodEnum = pricingSchema.enum("discount_method", ["CODE", "AUTOMATIC"]);

export const discountKindEnum = pricingSchema.enum("discount_kind", [
  "AMOUNT_OFF_PRODUCTS",
  "BUY_X_GET_Y",
  "AMOUNT_OFF_ORDER",
  "FREE_SHIPPING",
]);
export const discountCalculationStrategyEnum = pricingSchema.enum("discount_calculation_strategy", [
  "NATIVE",
  "FUNCTION",
]);
export const discountFunctionTargetEnum = pricingSchema.enum("discount_function_target", [
  "cart.lines.discounts.generate.run",
  "cart.delivery-options.discounts.generate.run",
]);
export const discountFunctionBindingStatusEnum = pricingSchema.enum(
  "discount_function_binding_status",
  ["ACTIVE", "DISABLED"],
);
export const discountFunctionFailureModeEnum = pricingSchema.enum(
  "discount_function_failure_mode",
  ["REQUIRED", "OPTIONAL"],
);

export const discountClassEnum = pricingSchema.enum("discount_class", [
  "PRODUCT",
  "ORDER",
  "SHIPPING",
]);

export const discountStateEnum = pricingSchema.enum("discount_state", [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "ARCHIVED",
]);

export const discountEffectiveStatusEnum = pricingSchema.enum("discount_effective_status", [
  "DRAFT",
  "SCHEDULED",
  "ACTIVE",
  "PAUSED",
  "EXPIRED",
  "ARCHIVED",
]);

export const discountCodeStatusEnum = pricingSchema.enum("discount_code_status", [
  "ACTIVE",
  "DISABLED",
]);

export const priceAdjustmentOperationEnum = pricingSchema.enum("price_adjustment_operation", [
  "DECREASE",
  "INCREASE",
]);

export const priceAdjustmentValueTypeEnum = pricingSchema.enum("price_adjustment_value_type", [
  "PERCENTAGE",
  "FIXED_AMOUNT",
]);

export const discountBenefitStrategyEnum = pricingSchema.enum("discount_benefit_strategy", [
  "ADJUSTMENT",
  "FREE",
]);

export const discountAllocationMethodEnum = pricingSchema.enum("discount_allocation_method", [
  "EACH",
  "ACROSS",
]);

export const discountRequirementTypeEnum = pricingSchema.enum("discount_requirement_type", [
  "SUBTOTAL",
  "QUANTITY",
]);

export const discountTargetRoleEnum = pricingSchema.enum("discount_target_role", [
  "QUALIFIER",
  "BENEFIT",
]);

export const discountTargetTypeEnum = pricingSchema.enum("discount_target_type", [
  "ALL_PRODUCTS",
  "PRODUCTS",
  "VARIANTS",
  "CATEGORIES",
]);

export const discountBuyerContextTypeEnum = pricingSchema.enum("discount_buyer_context_type", [
  "ALL",
  "CUSTOMERS",
  "SEGMENTS",
]);

export const referenceStatusEnum = pricingSchema.enum("reference_status", ["VALID", "STALE"]);

export const discountReservationStatusEnum = pricingSchema.enum("discount_reservation_status", [
  "ACTIVE",
  "COMMITTED",
  "RELEASED",
  "EXPIRED",
]);

export const discountRedemptionStatusEnum = pricingSchema.enum("discount_redemption_status", [
  "COMMITTED",
  "REVERSED",
]);

export const discountAllocationTargetTypeEnum = pricingSchema.enum(
  "discount_allocation_target_type",
  ["ORDER", "ORDER_LINE", "SHIPPING_LINE"],
);

export const externalSyncDirectionEnum = pricingSchema.enum("external_sync_direction", [
  "IMPORT",
  "EXPORT",
  "BIDIRECTIONAL",
]);

export const externalSyncStatusEnum = pricingSchema.enum("external_sync_status", [
  "PENDING",
  "SYNCED",
  "FAILED",
  "DISABLED",
]);
