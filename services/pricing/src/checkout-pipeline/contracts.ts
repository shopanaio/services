import type { Pricing } from "@shopana/broker-types";

export type CalculatePreliminaryQuoteParams =
  Pricing.CalculateCheckoutPreliminaryQuoteParams;
export type CalculatePreliminaryQuoteResult =
  Pricing.CalculateCheckoutPreliminaryQuoteResult;
export type FinalizeQuoteParams = Pricing.FinalizeCheckoutPricingQuoteParams;
export type FinalizeQuoteResult = Pricing.FinalizeCheckoutPricingQuoteResult;

/**
 * Pricing-owned application boundary consumed by the broker action adapter.
 * Implementations must validate the shared broker payload before calling this
 * port and must return a fully platform-owned immutable quote.
 */
export interface PricingCheckoutQuotePort {
  // TODO(pricing-checkout-pipeline): resolve merchandise, run cart transforms,
  // evaluate product/order discounts, allocate them, and build preliminary totals.
  calculatePreliminaryQuote(
    params: CalculatePreliminaryQuoteParams,
  ): Promise<CalculatePreliminaryQuoteResult>;

  // TODO(pricing-checkout-pipeline): evaluate delivery discounts and taxes from
  // selected delivery options without changing preliminary merchandise results.
  finalizeQuote(params: FinalizeQuoteParams): Promise<FinalizeQuoteResult>;
}

/** Broker handler surface. No handler is registered until the quote engine exists. */
export interface PricingCheckoutActionsContract {
  // TODO(pricing-checkout-pipeline): expose as
  // PricingCheckoutActions.calculatePreliminaryQuote.
  calculateCheckoutPreliminaryQuote(
    params: CalculatePreliminaryQuoteParams,
  ): Promise<CalculatePreliminaryQuoteResult>;

  // TODO(pricing-checkout-pipeline): expose as PricingCheckoutActions.finalizeQuote.
  finalizeCheckoutPricingQuote(
    params: FinalizeQuoteParams,
  ): Promise<FinalizeQuoteResult>;
}

/** Persistence boundary for immutable quote snapshots and optimistic revisions. */
export interface PricingQuoteSnapshotPort {
  // TODO(pricing-checkout-pipeline): persist a preliminary snapshot idempotently.
  savePreliminary(
    result: CalculatePreliminaryQuoteResult,
  ): Promise<CalculatePreliminaryQuoteResult>;

  // TODO(pricing-checkout-pipeline): persist a final snapshot idempotently.
  saveFinal(result: FinalizeQuoteResult): Promise<FinalizeQuoteResult>;
}

/** Usage is reserved during checkout completion, never during ordinary repricing. */
export interface PricingDiscountUsageReservationPort {
  // TODO(pricing-checkout-pipeline): atomically reserve all requirements for a
  // versioned final quote and return stable reservation IDs.
  reserveForQuote(input: Readonly<{
    storeId: string;
    checkoutId: string;
    quoteId: string;
    quoteRevision: string;
    idempotencyKey: string;
    requirements: readonly Pricing.PricingCheckoutDiscountUsageRequirement[];
  }>): Promise<
    Readonly<{
      reservations: readonly Readonly<{
        applicationId: string;
        reservationId: string;
      }>[];
    }>
  >;
}
