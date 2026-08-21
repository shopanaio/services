import type { Catalog, Pricing } from "@shopana/broker-types";

export type CalculatePreliminaryQuoteParams = Pricing.CalculateCheckoutPreliminaryQuoteParams;
export type CalculatePreliminaryQuoteResult = Pricing.CalculateCheckoutPreliminaryQuoteResult;
export type FinalizeQuoteParams = Pricing.FinalizeCheckoutPricingQuoteParams;
export type FinalizeQuoteResult = Pricing.FinalizeCheckoutPricingQuoteResult;

/**
 * Pricing-owned application boundary consumed by the broker action adapter.
 * Implementations must validate the shared broker payload before calling this
 * port and must return a fully platform-owned immutable quote.
 */
export interface PricingCheckoutQuotePort {
  /** Resolve merchandise, transform lines, evaluate discounts and persist totals. */
  calculatePreliminaryQuote(
    params: CalculatePreliminaryQuoteParams,
  ): Promise<CalculatePreliminaryQuoteResult>;

  /** Add delivery discounts without changing preliminary merchandise. */
  finalizeQuote(params: FinalizeQuoteParams): Promise<FinalizeQuoteResult>;
}

/** Catalog merchandise boundary used by preliminary Pricing. */
export interface PricingCatalogMerchandisePort {
  resolve(params: PricingCatalogMerchandiseParams): Promise<PricingCatalogMerchandiseResult>;
}

export type PricingCatalogMerchandiseParams = Catalog.ResolveCheckoutMerchandiseParams;
export type PricingCatalogMerchandiseResult = Catalog.ResolveCheckoutMerchandiseResult;

/** Registered broker handler surface. */
export interface PricingCheckoutActionsContract {
  calculateCheckoutPreliminaryQuote(
    params: CalculatePreliminaryQuoteParams,
  ): Promise<CalculatePreliminaryQuoteResult>;

  finalizeCheckoutPricingQuote(params: FinalizeQuoteParams): Promise<FinalizeQuoteResult>;
}

/** Persistence boundary for immutable quote snapshots. */
export interface PricingQuoteSnapshotPort {
  savePreliminary(
    result: CalculatePreliminaryQuoteResult,
  ): Promise<CalculatePreliminaryQuoteResult>;

  saveFinal(result: FinalizeQuoteResult): Promise<FinalizeQuoteResult>;
}

/** Usage is reserved during checkout completion, never during ordinary repricing. */
export interface PricingDiscountUsageReservationPort {
  reserveForQuote(
    input: Readonly<{
      storeId: string;
      checkoutId: string;
      quoteId: string;
      idempotencyKey: string;
      requirements: readonly Pricing.PricingCheckoutDiscountUsageRequirement[];
    }>,
  ): Promise<
    Readonly<{
      reservations: readonly Readonly<{
        applicationId: string;
        reservationId: string;
      }>[];
    }>
  >;
}
