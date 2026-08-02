import { createHash } from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Catalog } from "@shopana/broker-types";
import type { Database } from "../infrastructure/db/database.js";
import { inventoryItem, itemDimensions, itemWeight, warehouses, warehouseStock } from "../repositories/models/index.js";

export class CheckoutDeliveryFactsService {
  constructor(private readonly db: Database) {}

  async resolve(params: Catalog.ResolveCheckoutDeliveryFactsParams): Promise<Catalog.ResolveCheckoutDeliveryFactsResult> {
    if (params.lines.length === 0) return { ok: true, revision: digest([]), lines: [] };
    const variantIds = [...new Set(params.lines.map((line) => line.variantId))];
    const [items, weights, dimensions, locations, stocks] = await Promise.all([
      this.db.select().from(inventoryItem).where(and(eq(inventoryItem.storeId, params.storeId), inArray(inventoryItem.variantId, variantIds))),
      this.db.select().from(itemWeight).where(and(eq(itemWeight.storeId, params.storeId), inArray(itemWeight.variantId, variantIds))),
      this.db.select().from(itemDimensions).where(and(eq(itemDimensions.storeId, params.storeId), inArray(itemDimensions.variantId, variantIds))),
      this.db.select().from(warehouses).where(eq(warehouses.storeId, params.storeId)).orderBy(desc(warehouses.isDefault), asc(warehouses.id)),
      this.db.select().from(warehouseStock).where(and(eq(warehouseStock.storeId, params.storeId), inArray(warehouseStock.variantId, variantIds))),
    ]);
    const itemByVariant = new Map(items.map((item) => [item.variantId, item]));
    const weightByVariant = new Map(weights.map((item) => [item.variantId, item]));
    const dimensionsByVariant = new Map(dimensions.map((item) => [item.variantId, item]));
    const stockByKey = new Map(stocks.map((stock) => [`${stock.variantId}:${stock.warehouseId}`, stock]));
    const result: Catalog.ResolveCheckoutDeliveryLineResult[] = params.lines.map((line) => {
      const item = itemByVariant.get(line.variantId);
      if (!item || !item.requiresShipping) return rejected(line, "PHYSICAL_ITEM_NOT_FOUND", "Physical inventory facts are unavailable for the variant.");
      const weight = weightByVariant.get(line.variantId);
      const size = dimensionsByVariant.get(line.variantId);
      const fulfillmentLocations = locations.flatMap((location) => {
        if (!location.countryCode || !location.city) return [];
        const stock = stockByKey.get(`${line.variantId}:${location.id}`);
        const availableQuantity = item.trackInventory
          ? Math.max(0, (stock?.quantityOnHand ?? 0) - (stock?.reservedQty ?? 0) - (stock?.unavailableQty ?? 0))
          : null;
        return [{
          locationId: location.id,
          locationRevision: digest([location.id, location.updatedAt, location.countryCode, location.city, location.postalCode]),
          availableQuantity,
          address: {
            countryCode: location.countryCode, provinceCode: location.provinceCode, provinceName: location.provinceName,
            city: location.city, postalCode: location.postalCode, addressLine1: location.addressLine1, addressLine2: location.addressLine2,
          },
        }];
      });
      const physicalRevision = digest([item.id, item.updatedAt, weight ?? null, size ?? null, fulfillmentLocations]);
      return {
        status: "RESOLVED" as const, lineId: line.lineId, variantId: line.variantId, physicalRevision,
        weightGrams: weight?.weightGr ?? null,
        dimensionsMm: size ? { width: size.wMm, height: size.hMm, length: size.lMm } : null,
        customs: null,
        fulfillmentLocations,
      };
    });
    return { ok: true, revision: digest(result), lines: result };
  }
}

function rejected(line: { lineId: string; variantId: string }, code: string, message: string): Catalog.ResolveCheckoutDeliveryLineResult {
  return { status: "REJECTED", lineId: line.lineId, variantId: line.variantId, code, message, retryable: false };
}

function digest(value: unknown): string {
  return `cdf_v1_${createHash("sha256").update(JSON.stringify(value)).digest("base64url")}`;
}
