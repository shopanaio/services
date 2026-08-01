import type {
  DeliveryMethodType,
  ShippingPaymentModel,
} from "@shopana/shared-service-api";

import type { CheckoutCartLineIntent } from "./cartIntent.js";
import type {
  CheckoutPipelineJsonObject,
  CheckoutPipelineEligibilityContext,
  CheckoutPipelineMoney,
  CheckoutPipelineStageProvenance,
} from "./common.js";

export type CheckoutMerchandiseSnapshot = Readonly<{
  merchandiseId: string;
  revision: string;
  title: string;
  sku: string | null;
  imageUrl: string | null;
  isPhysical: boolean;
  data: CheckoutPipelineJsonObject | null;
}>;

export type CheckoutLineAvailability = Readonly<{
  available: boolean;
  maxQuantity: number | null;
  continueSellingWhenOutOfStock: boolean;
  reasonCode: string | null;
  revision: string;
}>;

export type CheckoutDiscountApplication = Readonly<{
  code: string | null;
  source: string;
  title: string;
  amount: CheckoutPipelineMoney;
  metadata: CheckoutPipelineJsonObject | null;
}>;

export type CheckoutQuotedLine = Readonly<{
  lineId: string;
  /** Exactly the lines marked true are included in checkout monetary totals. */
  contributesToTotals: boolean;
  quantity: number;
  merchandise: CheckoutMerchandiseSnapshot;
  availability: CheckoutLineAvailability;
  unitPrice: CheckoutPipelineMoney;
  originalUnitPrice: CheckoutPipelineMoney;
  compareAtUnitPrice: CheckoutPipelineMoney | null;
  subtotal: CheckoutPipelineMoney;
  total: CheckoutPipelineMoney;
  discounts: readonly CheckoutDiscountApplication[];
  children: readonly CheckoutQuotedLine[];
}>;

export type CheckoutTransformedLineLineage = Readonly<{
  lineId: string;
  sourceLineIds: readonly string[];
}>;

/**
 * Explicit pricing disposition for every source cart line. Pricing may split or
 * merge lines, but it must never omit a source line without a reason.
 */
export type CheckoutSourceLineResolution =
  | Readonly<{
      sourceLineId: string;
      status: "TRANSFORMED";
      transformedLineIds: readonly string[];
    }>
  | Readonly<{
      sourceLineId: string;
      status: "REMOVED";
      reason: Readonly<{
        code: string;
        message: string;
      }>;
    }>;

export type CheckoutCanonicalDeliveryDestination = Readonly<{
  destinationId: string;
  location: Readonly<{
    countryCode: string;
    provinceCode: string | null;
    postalCode: string | null;
  }>;
  transformedLineIds: readonly string[];
}>;

/**
 * Pricing produces this intent after cart transforms. Delivery must use these
 * transformed line IDs instead of the source cart destination assignments.
 */
export type CheckoutCanonicalDeliveryIntent = Readonly<{
  revision: string;
  lineage: readonly CheckoutTransformedLineLineage[];
  destinations: readonly CheckoutCanonicalDeliveryDestination[];
  /** Physical transformed lines awaiting a complete delivery destination. */
  unassignedPhysicalLineIds: readonly string[];
}>;

export type CheckoutPricingCartIntent = Readonly<{
  lines: readonly CheckoutCartLineIntent[];
  discountCodes: readonly string[];
  destinations: readonly Readonly<{
    destinationId: string;
    location: Readonly<{
      countryCode: string;
      provinceCode: string | null;
      postalCode: string | null;
    }>;
    lineIds: readonly string[];
  }>[];
  attributes: CheckoutPipelineJsonObject;
}>;

export type CheckoutPricingDeliveryOption = Readonly<{
  handle: string;
  code: string;
  providerCode: string;
  deliveryMethodType:
    | DeliveryMethodType.PICKUP
    | DeliveryMethodType.SHIPPING;
  shippingPaymentModel: ShippingPaymentModel;
  cost: CheckoutPipelineMoney;
}>;

export type CheckoutPricingDeliverySnapshot = Readonly<
  CheckoutPipelineStageProvenance & {
    revision: string;
    basedOnPreliminaryRevision: string;
    groups: readonly Readonly<{
      groupId: string;
      lineIds: readonly string[];
      options: readonly CheckoutPricingDeliveryOption[];
      selectedOptionHandle: string | null;
    }>[];
  }
>;

export type CheckoutPreliminaryPricingTotals = Readonly<{
  merchandiseSubtotal: CheckoutPipelineMoney;
  merchandiseDiscountTotal: CheckoutPipelineMoney;
  merchandiseTotal: CheckoutPipelineMoney;
}>;

export type CheckoutPricingTotals = Readonly<{
  merchandiseSubtotal: CheckoutPipelineMoney;
  merchandiseDiscountTotal: CheckoutPipelineMoney;
  merchandiseTotal: CheckoutPipelineMoney;
  taxTotal: CheckoutPipelineMoney;
  deliverySubtotal: CheckoutPipelineMoney;
  deliveryDiscountTotal: CheckoutPipelineMoney;
  deliveryTotal: CheckoutPipelineMoney;
  payableTotal: CheckoutPipelineMoney;
}>;

export type CalculatePreliminaryPricingRequest = Readonly<{
  context: CheckoutPipelineEligibilityContext;
  cartIntent: CheckoutPricingCartIntent;
}>;

export type CalculatePreliminaryPricingResult = Readonly<
  CheckoutPipelineStageProvenance & {
    preliminaryQuoteId: string;
    revision: string;
    transformedLines: readonly CheckoutQuotedLine[];
    sourceLineResolutions: readonly CheckoutSourceLineResolution[];
    deliveryIntent: CheckoutCanonicalDeliveryIntent;
    merchandiseRevision: string;
    availabilityRevision: string;
    appliedDiscounts: readonly CheckoutDiscountApplication[];
    rejectedDiscountCodes: readonly string[];
    preliminaryTotals: CheckoutPreliminaryPricingTotals;
  }
>;

export type FinalizePricingQuoteRequest = Readonly<{
  context: CheckoutPipelineEligibilityContext;
  preliminary: CalculatePreliminaryPricingResult;
  delivery: CheckoutPricingDeliverySnapshot;
}>;

export type FinalizePricingQuoteResult = Readonly<
  CheckoutPipelineStageProvenance & {
    quoteId: string;
    revision: string;
    basedOnPreliminaryRevision: string;
    basedOnDeliveryRevision: string;
    lines: readonly CheckoutQuotedLine[];
    appliedDiscounts: readonly CheckoutDiscountApplication[];
    rejectedDiscountCodes: readonly string[];
    totals: CheckoutPricingTotals;
  }
>;
