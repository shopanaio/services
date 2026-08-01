/**
 * Pricing-owned broker contracts used by the Checkout recalculation pipeline.
 *
 * Checkout orchestrates the stages, while Pricing exclusively resolves
 * merchandise, evaluates native/App discount candidates, allocates discounts,
 * performs rounding, and produces immutable monetary snapshots.
 */

export const PricingCheckoutActionNames = {
  calculatePreliminaryQuote: "calculateCheckoutPreliminaryQuote",
  finalizeQuote: "finalizeCheckoutPricingQuote",
} as const;

export const PricingCheckoutActions = {
  calculatePreliminaryQuote:
    `pricing.${PricingCheckoutActionNames.calculatePreliminaryQuote}`,
  finalizeQuote: `pricing.${PricingCheckoutActionNames.finalizeQuote}`,
} as const;

export type PricingCheckoutJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly PricingCheckoutJsonValue[]
  | { readonly [key: string]: PricingCheckoutJsonValue };

export type PricingCheckoutJsonObject = Readonly<{
  [key: string]: PricingCheckoutJsonValue;
}>;

export interface PricingCheckoutMoney {
  amountMinor: string;
  currencyCode: string;
}

export interface PricingCheckoutStageProvenance {
  executionId: string;
  checkoutId: string;
  basedOnCheckoutVersion: number;
  currencyCode: string;
}

export type PricingCheckoutPurchaseType = "ONE_TIME" | "SUBSCRIPTION";

export type PricingCheckoutLinePurchaseIntent =
  | Readonly<{
      type: "ONE_TIME";
      sellingPlanId: null;
    }>
  | Readonly<{
      type: "SUBSCRIPTION";
      sellingPlanId: string;
    }>;

export interface PricingCheckoutCartLineIntent {
  lineId: string;
  /** Catalog variant identity. Checkout merchandise is never a product ID. */
  variantId: string;
  /** Null for roots; required for nested component selections. */
  componentSelection: Readonly<{ componentItemId: string }> | null;
  /**
   * Root quantity is absolute. Nested source quantity is per one unit of its
   * parent; Pricing must materialize absolute quantities in transformed lines.
   */
  quantity: number;
  purchase: PricingCheckoutLinePurchaseIntent;
  attributes: PricingCheckoutJsonObject;
  children: readonly PricingCheckoutCartLineIntent[];
}

export interface PricingCheckoutBuyerEligibilityContext {
  customerId: string | null;
  countryCode: string | null;
  marketId: string | null;
  companyId: string | null;
  /** Canonical membership snapshot resolved before Pricing evaluates rules. */
  segmentIds: readonly string[];
  segmentMembershipRevision: string | null;
}

export interface PricingCheckoutEvaluationContext {
  executionId: string;
  checkoutId: string;
  expectedCheckoutVersion: number;
  currencyCode: string;
  correlationId: string;
  deadlineAt: string;
  requestedAt: string;
  storeId: string;
  localeCode: string | null;
  /** Explicit sales channel used by discount availability rules. */
  channelCode: string;
  /** Immutable business-time boundary for schedules and catalog pricing. */
  effectiveAt: string;
  buyerEligibility: PricingCheckoutBuyerEligibilityContext | null;
}

export interface PricingCheckoutLocation {
  countryCode: string;
  provinceCode: string | null;
  postalCode: string | null;
}

export interface PricingCheckoutDestinationIntent {
  destinationId: string;
  location: PricingCheckoutLocation;
  lineIds: readonly string[];
}

export interface PricingCheckoutCartIntent {
  lines: readonly PricingCheckoutCartLineIntent[];
  discountCodes: readonly string[];
  destinations: readonly PricingCheckoutDestinationIntent[];
  attributes: PricingCheckoutJsonObject;
}

export interface PricingCheckoutMerchandiseTargetingSnapshot {
  productId: string;
  categoryIds: readonly string[];
  tagIds: readonly string[];
  featureIds: readonly string[];
  optionValueIds: readonly string[];
}

export interface PricingCheckoutMerchandiseSnapshot {
  /** Exact Catalog variant identity; product IDs are never purchasable IDs. */
  variantId: string;
  revision: string;
  title: string;
  sku: string | null;
  imageUrl: string | null;
  isPhysical: boolean;
  targeting: PricingCheckoutMerchandiseTargetingSnapshot;
  data: PricingCheckoutJsonObject | null;
}

export interface PricingCheckoutLineAvailability {
  available: boolean;
  maxQuantity: number | null;
  continueSellingWhenOutOfStock: boolean;
  reasonCode: string | null;
  revision: string;
}

export type PricingCheckoutDiscountClass = "PRODUCT" | "ORDER" | "SHIPPING";
export type PricingCheckoutDiscountMethod = "AUTOMATIC" | "CODE";

export interface PricingCheckoutDiscountCodeReference {
  codeId: string;
  inputCode: string;
  normalizedCode: string;
}

export type PricingCheckoutDiscountSource =
  | Readonly<{ kind: "NATIVE" }>
  | Readonly<{
      kind: "FUNCTION";
      functionBindingId: string;
      implementationId: string;
      functionTarget: string;
      executionId: string;
      planRevision: string;
    }>;

export type PricingCheckoutDiscountAllocation =
  | Readonly<{
      targetType: "LINE";
      lineId: string;
      quantity: number | null;
      amount: PricingCheckoutMoney;
    }>
  | Readonly<{
      targetType: "DELIVERY_GROUP";
      groupId: string;
      amount: PricingCheckoutMoney;
    }>;

/** Platform-owned result after candidate validation, combination and rounding. */
export interface PricingCheckoutDiscountApplication {
  applicationId: string;
  discountId: string;
  configurationRevision: string;
  discountClass: PricingCheckoutDiscountClass;
  method: PricingCheckoutDiscountMethod;
  code: PricingCheckoutDiscountCodeReference | null;
  source: PricingCheckoutDiscountSource;
  title: string;
  priority: number;
  amount: PricingCheckoutMoney;
  allocations: readonly PricingCheckoutDiscountAllocation[];
  metadata: PricingCheckoutJsonObject | null;
}

export interface PricingCheckoutLineDiscountAllocation {
  applicationId: string;
  amount: PricingCheckoutMoney;
  quantity: number | null;
}

export type PricingCheckoutDiscountCodeRejectionReason =
  | "NOT_FOUND"
  | "DISABLED"
  | "NOT_ACTIVE"
  | "CHANNEL_NOT_ELIGIBLE"
  | "PURCHASE_TYPE_NOT_ELIGIBLE"
  | "BUYER_NOT_ELIGIBLE"
  | "USAGE_LIMIT_REACHED"
  | "MINIMUM_REQUIREMENT_NOT_MET"
  | "TARGET_NOT_ELIGIBLE"
  | "COMBINATION_EXCLUDED"
  | "FUNCTION_FAILED"
  | "INVALID_FUNCTION_OUTPUT";

export type PricingCheckoutDiscountCodeResolution =
  | Readonly<{
      inputCode: string;
      normalizedCode: string;
      status: "APPLIED";
      discountId: string;
      codeId: string;
      applicationIds: readonly string[];
    }>
  | Readonly<{
      inputCode: string;
      normalizedCode: string;
      status: "PENDING";
      discountId: string;
      codeId: string;
      reason: "AWAITING_DELIVERY";
    }>
  | Readonly<{
      inputCode: string;
      normalizedCode: string;
      status: "REJECTED";
      discountId: string | null;
      codeId: string | null;
      reason: PricingCheckoutDiscountCodeRejectionReason;
      message: string;
      retryable: boolean;
    }>;

export interface PricingCheckoutDiscountUsageRequirement {
  applicationId: string;
  discountId: string;
  codeId: string | null;
  customerId: string | null;
  configurationRevision: string;
  usageCounterRevision: string;
  reservationRequired: boolean;
}

export interface PricingCheckoutQuotedLine {
  lineId: string;
  contributesToTotals: boolean;
  /** Absolute quantity after all ancestor component quantities are applied. */
  quantity: number;
  purchase: PricingCheckoutLinePurchaseIntent;
  merchandise: PricingCheckoutMerchandiseSnapshot;
  availability: PricingCheckoutLineAvailability;
  unitPrice: PricingCheckoutMoney;
  originalUnitPrice: PricingCheckoutMoney;
  compareAtUnitPrice: PricingCheckoutMoney | null;
  subtotal: PricingCheckoutMoney;
  total: PricingCheckoutMoney;
  discountAllocations: readonly PricingCheckoutLineDiscountAllocation[];
  children: readonly PricingCheckoutQuotedLine[];
}

export interface PricingCheckoutTransformedLineLineage {
  lineId: string;
  sourceLineIds: readonly string[];
}

export type PricingCheckoutSourceLineResolution =
  | Readonly<{
      sourceLineId: string;
      status: "TRANSFORMED";
      transformedLineIds: readonly string[];
    }>
  | Readonly<{
      sourceLineId: string;
      status: "REMOVED";
      reason: Readonly<{ code: string; message: string }>;
    }>;

export interface PricingCheckoutCanonicalDeliveryDestination {
  destinationId: string;
  location: PricingCheckoutLocation;
  transformedLineIds: readonly string[];
}

export interface PricingCheckoutCanonicalDeliveryIntent {
  revision: string;
  lineage: readonly PricingCheckoutTransformedLineLineage[];
  destinations: readonly PricingCheckoutCanonicalDeliveryDestination[];
  unassignedPhysicalLineIds: readonly string[];
}

export type PricingCheckoutDeliveryMethodType =
  | "LOCAL"
  | "NONE"
  | "PICK_UP"
  | "PICKUP_POINT"
  | "RETAIL"
  | "SHIPPING";

export interface PricingCheckoutDeliveryOption {
  handle: string;
  code: string;
  carrierCode: string | null;
  deliveryMethodType: PricingCheckoutDeliveryMethodType;
  cost: PricingCheckoutMoney;
}

export interface PricingCheckoutDeliverySnapshot
  extends PricingCheckoutStageProvenance {
  revision: string;
  basedOnPreliminaryRevision: string;
  groups: readonly Readonly<{
    groupId: string;
    lineIds: readonly string[];
    options: readonly PricingCheckoutDeliveryOption[];
    selectedOptionHandle: string | null;
  }>[];
}

export interface PricingCheckoutPreliminaryTotals {
  merchandiseSubtotal: PricingCheckoutMoney;
  merchandiseDiscountTotal: PricingCheckoutMoney;
  merchandiseTotal: PricingCheckoutMoney;
}

export interface PricingCheckoutTotals {
  merchandiseSubtotal: PricingCheckoutMoney;
  merchandiseDiscountTotal: PricingCheckoutMoney;
  merchandiseTotal: PricingCheckoutMoney;
  /** V1 tax policy: always zero until line-level tax allocations are added. */
  taxTotal: PricingCheckoutMoney;
  deliverySubtotal: PricingCheckoutMoney;
  deliveryDiscountTotal: PricingCheckoutMoney;
  deliveryTotal: PricingCheckoutMoney;
  payableTotal: PricingCheckoutMoney;
}

export interface CalculateCheckoutPreliminaryQuoteParams {
  context: PricingCheckoutEvaluationContext;
  cartIntent: PricingCheckoutCartIntent;
}

export interface CalculateCheckoutPreliminaryQuoteResult
  extends PricingCheckoutStageProvenance {
  preliminaryQuoteId: string;
  revision: string;
  discountEvaluationRevision: string;
  transformedLines: readonly PricingCheckoutQuotedLine[];
  sourceLineResolutions: readonly PricingCheckoutSourceLineResolution[];
  deliveryIntent: PricingCheckoutCanonicalDeliveryIntent;
  merchandiseRevision: string;
  availabilityRevision: string;
  appliedDiscounts: readonly PricingCheckoutDiscountApplication[];
  discountCodeResolutions: readonly PricingCheckoutDiscountCodeResolution[];
  usageRequirements: readonly PricingCheckoutDiscountUsageRequirement[];
  preliminaryTotals: PricingCheckoutPreliminaryTotals;
}

export interface FinalizeCheckoutPricingQuoteParams {
  context: PricingCheckoutEvaluationContext;
  preliminary: CalculateCheckoutPreliminaryQuoteResult;
  delivery: PricingCheckoutDeliverySnapshot;
}

export interface FinalizeCheckoutPricingQuoteResult
  extends PricingCheckoutStageProvenance {
  quoteId: string;
  revision: string;
  discountEvaluationRevision: string;
  basedOnPreliminaryDiscountEvaluationRevision: string;
  basedOnPreliminaryRevision: string;
  basedOnDeliveryRevision: string;
  lines: readonly PricingCheckoutQuotedLine[];
  appliedDiscounts: readonly PricingCheckoutDiscountApplication[];
  discountCodeResolutions: readonly PricingCheckoutDiscountCodeResolution[];
  usageRequirements: readonly PricingCheckoutDiscountUsageRequirement[];
  totals: PricingCheckoutTotals;
}
