import { SubgraphReference } from "@shopana/type-resolver";
import type { InventoryItem } from "../../repositories/models/index.js";
import { InventoryType } from "./InventoryType.js";
import { StockResolver } from "./StockResolver.js";

/**
 * InventoryItemResolver - resolves InventoryItem GraphQL type.
 *
 * InventoryItem is a 1:1 entity with Catalog.Variant.
 * Contains inventory-specific data:
 * - SKU
 * - Track inventory settings
 * - Dimensions and weight (via federation)
 * - Cost history (via federation)
 * - Stock levels (via federation)
 */
@SubgraphReference()
export class InventoryItemResolver extends InventoryType<string, InventoryItem> {
  async $preload(): Promise<InventoryItem> {
    const data = await this.$ctx.loaders.inventoryItem.load(this.$props);
    if (!data) {
      throw new Error(`InventoryItem not found: ${this.$props}`);
    }
    return data;
  }

  id() {
    return this.$props;
  }

  /**
   * Reference to Variant in Catalog Service (federation reference).
   */
  async variant() {
    const variantId = await this.$get("variantId");
    return { __typename: "Variant" as const, id: variantId };
  }

  async sku() {
    return this.$get("sku");
  }

  async trackInventory() {
    return (await this.$get("trackInventory")) ?? true;
  }

  async continueSellingWhenOutOfStock() {
    return (await this.$get("continueSellingWhenOutOfStock")) ?? false;
  }

  /**
   * Dimensions from physical table.
   */
  async dimensions() {
    const variantId = await this.$get("variantId");
    const dims = await this.$ctx.kernel
      .getServices()
      .repository.physical.getDimensionsByVariantIds([variantId]);

    const current = dims[0];
    if (!current) return null;

    return {
      width: current.wMm,
      length: current.lMm,
      height: current.hMm,
    };
  }

  /**
   * Weight from physical table.
   */
  async weight() {
    const variantId = await this.$get("variantId");
    const weights = await this.$ctx.kernel
      .getServices()
      .repository.physical.getWeightsByVariantIds([variantId]);

    const current = weights[0];
    if (!current) return null;

    return {
      value: current.weightGr,
    };
  }

  /**
   * Current cost from cost history table.
   */
  async cost() {
    const variantId = await this.$get("variantId");
    const costs = await this.$ctx.kernel
      .getServices()
      .repository.cost.getActiveCostsByVariantIds([variantId]);

    if (costs.length === 0) return null;

    // Filter by currency if specified in context
    let filtered = costs;
    if (this.$ctx.currency) {
      filtered = costs.filter((c) => c.currency === this.$ctx.currency);
    }
    if (filtered.length === 0) return null;

    const current = filtered[0];
    return {
      id: current.id,
      currency: current.currency,
      unitCostMinor: current.unitCostMinor,
      effectiveFrom: current.effectiveFrom,
      effectiveTo: current.effectiveTo,
      recordedAt: current.recordedAt,
      isCurrent: current.effectiveTo === null,
    };
  }

  /**
   * Stock levels across all warehouses.
   */
  async stock() {
    const variantId = await this.$get("variantId");
    const stocks = await this.$ctx.kernel
      .getServices()
      .repository.stock.getByVariantId(variantId);

    return stocks.map((s) => new StockResolver(s.id, this.$ctx));
  }

  /**
   * Check if any stock is available.
   */
  async inStock() {
    const variantId = await this.$get("variantId");
    const stocks = await this.$ctx.kernel
      .getServices()
      .repository.stock.getByVariantId(variantId);

    return stocks.some((s) => s.quantityOnHand > 0);
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }
}
