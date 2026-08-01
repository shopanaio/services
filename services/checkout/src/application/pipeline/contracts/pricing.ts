/**
 * Checkout-facing aliases for the Pricing broker boundary.
 *
 * The canonical cross-service contract lives in @shopana/broker-types so the
 * Checkout caller and Pricing provider cannot drift independently.
 */
export type {
  PricingCheckoutCanonicalDeliveryDestination as CheckoutCanonicalDeliveryDestination,
  PricingCheckoutCanonicalDeliveryIntent as CheckoutCanonicalDeliveryIntent,
  PricingCheckoutCartIntent as CheckoutPricingCartIntent,
  PricingCheckoutDeliveryOption as CheckoutPricingDeliveryOption,
  PricingCheckoutDeliverySnapshot as CheckoutPricingDeliverySnapshot,
  PricingCheckoutDiscountAllocation as CheckoutDiscountAllocation,
  PricingCheckoutDiscountApplication as CheckoutDiscountApplication,
  PricingCheckoutDiscountClass as CheckoutDiscountClass,
  PricingCheckoutDiscountCodeReference as CheckoutDiscountCodeReference,
  PricingCheckoutDiscountCodeRejectionReason as CheckoutDiscountCodeRejectionReason,
  PricingCheckoutDiscountCodeResolution as CheckoutDiscountCodeResolution,
  PricingCheckoutDiscountMethod as CheckoutDiscountMethod,
  PricingCheckoutDiscountSource as CheckoutDiscountSource,
  PricingCheckoutDiscountUsageRequirement as CheckoutDiscountUsageRequirement,
  PricingCheckoutLineAvailability as CheckoutLineAvailability,
  PricingCheckoutLineDiscountAllocation as CheckoutLineDiscountAllocation,
  PricingCheckoutMerchandiseSnapshot as CheckoutMerchandiseSnapshot,
  PricingCheckoutMerchandiseTargetingSnapshot as CheckoutMerchandiseTargetingSnapshot,
  PricingCheckoutPreliminaryTotals as CheckoutPreliminaryPricingTotals,
  PricingCheckoutQuotedLine as CheckoutQuotedLine,
  PricingCheckoutSourceLineResolution as CheckoutSourceLineResolution,
  PricingCheckoutTotals as CheckoutPricingTotals,
  PricingCheckoutTransformedLineLineage as CheckoutTransformedLineLineage,
  CalculateCheckoutPreliminaryQuoteParams as CalculatePreliminaryPricingRequest,
  CalculateCheckoutPreliminaryQuoteResult as CalculatePreliminaryPricingResult,
  FinalizeCheckoutPricingQuoteParams as FinalizePricingQuoteRequest,
  FinalizeCheckoutPricingQuoteResult as FinalizePricingQuoteResult,
} from "@shopana/broker-types";
