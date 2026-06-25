import { encodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { CatalogType } from "./CatalogType.js";
import { InventoryItemResolver } from "./InventoryItemResolver.js";
import { StockResolver } from "./StockResolver.js";

/**
 * VariantFederationResolver - Federation resolver for Variant.
 *
 * Extends Variant from Catalog Service with inventory-related fields.
 * Catalog Service owns the Variant type.
 * Inventory Service adds fields through @extends directive.
 *
 * Fields added by Inventory Service:
 * - sku: SKU code (from InventoryItem)
 * - dimensions: Physical dimensions
 * - weight: Physical weight
 * - cost: Current cost
 * - costHistory: Cost history
 * - stock: Stock levels by warehouse
 * - inStock: Boolean availability check
 * - inventoryItem: The associated InventoryItem entity
 */
export class VariantFederationResolver extends CatalogType<string, Record<string, never>> {
  // Variant ID passed from federation (decoded UUID) - must encode for GraphQL response
  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.Variant);
  }

  /**
   * Get the associated InventoryItem.
   * This is the primary way to access inventory data for a variant.
   */
  async inventoryItem() {
    const item = await this.$ctx.loaders.inventoryItemByVariant.load(this.$props);
    if (!item) return null;
    return new InventoryItemResolver(item.id, this.$ctx);
  }

  /**
   * SKU from InventoryItem (for backward compatibility).
   */
  async sku() {
    const item = await this.$ctx.loaders.inventoryItemByVariant.load(this.$props);
    return item?.sku ?? null;
  }

  /**
   * Dimensions from physical table.
   */
  async dimensions() {
    const dims = await this.$ctx.kernel
      .getServices()
      .repository.physical.getDimensionsByVariantIds([this.$props]);

    const current = dims[0];
    if (!current) return null;

    return {
      widthMm: current.wMm,
      lengthMm: current.lMm,
      heightMm: current.hMm,
      displayUnit: "mm",
    };
  }

  /**
   * Weight from physical table.
   */
  async weight() {
    const weights = await this.$ctx.kernel
      .getServices()
      .repository.physical.getWeightsByVariantIds([this.$props]);

    const current = weights[0];
    if (!current) return null;

    return {
      weightGrams: current.weightGr,
      displayUnit: "g",
    };
  }

  /**
   * Current unit cost from cost history table.
   */
  async unitCost() {
    const costs = await this.$ctx.kernel
      .getServices()
      .repository.cost.getActiveCostsByVariantIds([this.$props]);

    if (costs.length === 0) return null;

    // Filter by currency if specified in context
    let filtered = costs;
    if (this.$ctx.currency) {
      filtered = costs.filter((c) => c.currency === this.$ctx.currency);
    }
    if (filtered.length === 0) return null;

    const current = filtered[0];
    return {
      currency: current.currency,
      amountMinor: current.unitCostMinor,
      effectiveFrom: current.effectiveFrom,
    };
  }

  /**
   * Stock levels across all warehouses.
   */
  async stock() {
    const stocks = await this.$ctx.kernel
      .getServices()
      .repository.stock.getByVariantId(this.$props);

    return stocks.map((s) => new StockResolver(s.id, this.$ctx));
  }

  /**
   * Check if any stock is available.
   */
  async inStock() {
    const stocks = await this.$ctx.kernel
      .getServices()
      .repository.stock.getByVariantId(this.$props);

    return stocks.some((s) => s.quantityOnHand > 0);
  }
}
