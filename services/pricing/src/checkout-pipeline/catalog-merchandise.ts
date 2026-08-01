import type { Catalog, Pricing } from "@shopana/broker-types";

/**
 * Build the exact Catalog read from Pricing's canonical cart intent. Keeping
 * this mapping here prevents adapters from guessing component and subscription
 * semantics independently.
 */
export function toCatalogMerchandiseParams(
  context: Pricing.PricingCheckoutEvaluationContext,
  cart: Pricing.PricingCheckoutCartIntent,
): Catalog.ResolveCheckoutMerchandiseParams {
  return {
    storeId: context.storeId,
    currencyCode: context.currencyCode,
    localeCode: context.localeCode,
    effectiveAt: context.effectiveAt,
    lines: cart.lines.map(toCatalogMerchandiseLine),
  };
}

function toCatalogMerchandiseLine(
  line: Pricing.PricingCheckoutCartLineIntent,
): Catalog.ResolveCheckoutMerchandiseLineInput {
  return {
    lineId: line.lineId,
    variantId: line.variantId,
    componentSelection:
      line.componentSelection === null
        ? null
        : { componentItemId: line.componentSelection.componentItemId },
    purchase:
      line.purchase.type === "ONE_TIME"
        ? { type: "ONE_TIME", sellingPlanId: null }
        : {
            type: "SUBSCRIPTION",
            sellingPlanId: line.purchase.sellingPlanId,
          },
    quantity: line.quantity,
    children: line.children.map(toCatalogMerchandiseLine),
  };
}

/** Canonical Catalog inventory semantics consumed by Pricing. */
export function toPricingLineAvailability(
  availability: Catalog.CheckoutMerchandiseAvailabilitySnapshot,
): Pricing.PricingCheckoutLineAvailability {
  return {
    available: availability.available,
    maxQuantity:
      !availability.tracked || availability.continueSellingWhenOutOfStock
        ? null
        : availability.availableQuantity,
    continueSellingWhenOutOfStock:
      availability.continueSellingWhenOutOfStock,
    reasonCode: availability.unavailabilityReason,
    revision: availability.revision,
  };
}
