import type { Catalog } from "@shopana/broker-types";
import { contentRevision } from "./canonicalJson.js";
import type { CheckoutCatalogRow, ResolvedCheckoutMerchandiseEntry } from "./contracts.js";

export function aggregateResolvedDemand(
  entries: readonly ResolvedCheckoutMerchandiseEntry[],
): Map<string, number> {
  const result = new Map<string, number>();
  for (const { source } of entries) {
    result.set(
      source.input.variantId,
      (result.get(source.input.variantId) ?? 0) + source.absoluteQuantity,
    );
  }
  return result;
}

export function buildCheckoutAvailability(
  row: CheckoutCatalogRow,
  aggregateDemand: number,
): Catalog.CheckoutMerchandiseAvailabilitySnapshot {
  const sellable = Math.max(
    0,
    row.stocks.reduce(
      (sum, stock) => sum + stock.quantityOnHand - stock.reservedQty - stock.unavailableQty,
      0,
    ),
  );
  const tracked = row.inventory?.trackInventory ?? false;
  const continueSellingWhenOutOfStock = row.inventory?.continueSellingWhenOutOfStock ?? false;
  const available = !tracked || continueSellingWhenOutOfStock || sellable >= aggregateDemand;
  const unavailabilityReason = available
    ? null
    : sellable === 0
      ? "OUT_OF_STOCK"
      : "INSUFFICIENT_STOCK";

  return {
    available,
    tracked,
    availableQuantity: tracked ? sellable : null,
    continueSellingWhenOutOfStock,
    unavailabilityReason,
    revision: contentRevision("catalog-availability", {
      inventory: row.inventory,
      stocks: row.stocks,
      aggregateDemand,
      available,
      unavailabilityReason,
    }),
  };
}
