import type {
  CalculatePreliminaryPricingRequest,
  CalculatePreliminaryPricingResult,
  FinalizePricingQuoteRequest,
  FinalizePricingQuoteResult,
} from "../contracts/index.js";

/**
 * Checkout-owned interface implemented by the Pricing broker adapter.
 * The adapter must use the exported request parser before each call and the
 * request-relative result parser for every untrusted broker response.
 */
export interface PricingCheckoutPort {
  // TODO(checkout-pipeline): implement the preliminary pricing/transform action.
  calculatePreliminaryQuote(
    request: CalculatePreliminaryPricingRequest,
  ): Promise<CalculatePreliminaryPricingResult>;

  // TODO(checkout-pipeline): implement final pricing after delivery selection.
  finalizeQuote(request: FinalizePricingQuoteRequest): Promise<FinalizePricingQuoteResult>;
}
