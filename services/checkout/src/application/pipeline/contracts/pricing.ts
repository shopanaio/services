import type { CheckoutCartIntent } from "./cartIntent.js";
import type {
  CheckoutPipelineAddress,
  CheckoutPipelineExecutionContext,
  CheckoutPipelineJsonObject,
  CheckoutPipelineMoney,
  CheckoutPipelineStageProvenance,
} from "./common.js";
import type { CalculateDeliveryOptionsResult } from "./delivery.js";

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

export type CheckoutCanonicalDeliveryDestination = Readonly<{
  destinationId: string;
  address: CheckoutPipelineAddress;
  transformedLineIds: readonly string[];
  selectedDeliveryOptionHandle: string | null;
}>;

/**
 * Pricing produces this intent after cart transforms. Delivery must use these
 * transformed line IDs instead of the source cart destination assignments.
 */
export type CheckoutCanonicalDeliveryIntent = Readonly<{
  revision: string;
  lineage: readonly CheckoutTransformedLineLineage[];
  destinations: readonly CheckoutCanonicalDeliveryDestination[];
}>;

export type CheckoutPreliminaryPricingTotals = Readonly<{
  merchandiseSubtotal: CheckoutPipelineMoney;
  merchandiseDiscountTotal: CheckoutPipelineMoney;
  merchandiseTotal: CheckoutPipelineMoney;
}>;

export type CheckoutPricingTotals = Readonly<{
  subtotal: CheckoutPipelineMoney;
  discountTotal: CheckoutPipelineMoney;
  taxTotal: CheckoutPipelineMoney;
  deliveryTotal: CheckoutPipelineMoney;
  payableTotal: CheckoutPipelineMoney;
}>;

export type CalculatePreliminaryPricingRequest = Readonly<{
  context: CheckoutPipelineExecutionContext;
  cartIntent: CheckoutCartIntent;
}>;

export type CalculatePreliminaryPricingResult = Readonly<
  CheckoutPipelineStageProvenance & {
    preliminaryQuoteId: string;
    revision: string;
    transformedLines: readonly CheckoutQuotedLine[];
    deliveryIntent: CheckoutCanonicalDeliveryIntent;
    merchandiseRevision: string;
    availabilityRevision: string;
    appliedDiscounts: readonly CheckoutDiscountApplication[];
    rejectedDiscountCodes: readonly string[];
    preliminaryTotals: CheckoutPreliminaryPricingTotals;
  }
>;

export type FinalizePricingQuoteRequest = Readonly<{
  context: CheckoutPipelineExecutionContext;
  preliminary: CalculatePreliminaryPricingResult;
  delivery: CalculateDeliveryOptionsResult;
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
