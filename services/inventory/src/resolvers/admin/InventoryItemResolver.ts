import { encodeGlobalId, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { InventoryType, Cache } from "./InventoryType.js";
import { StockResolver } from "./StockResolver.js";
import type { InventoryItem, ItemDimensions, ItemWeight, ProductVariantCostHistory } from "../../repositories/models/index.js";

/**
 * Resolver for InventoryItem type.
 * Handles inventory-specific data for variants.
 */
export class InventoryItemResolver extends InventoryType<string> {
  @Cache()
  private async loadItem(): Promise<InventoryItem | null> {
    return this.$ctx.kernel.repository.inventoryItem.findById(this.$data);
  }

  async id(): Promise<string | null> {
    const item = await this.loadItem();
    if (!item) return null;
    return encodeGlobalId(GlobalIdEntity.InventoryItem, item.id);
  }

  async variantId(): Promise<string | null> {
    const item = await this.loadItem();
    if (!item) return null;
    return encodeGlobalId(GlobalIdEntity.Variant, item.variantId);
  }

  async sku(): Promise<string | null> {
    const item = await this.loadItem();
    return item?.sku ?? null;
  }

  async trackInventory(): Promise<boolean> {
    const item = await this.loadItem();
    return item?.trackInventory ?? true;
  }

  async continueSellingWhenOutOfStock(): Promise<boolean> {
    const item = await this.loadItem();
    return item?.continueSellingWhenOutOfStock ?? false;
  }

  async dimensions(): Promise<{
    widthMm: number;
    heightMm: number;
    lengthMm: number;
    displayUnit: string;
  } | null> {
    const item = await this.loadItem();
    if (!item) return null;

    const dims = await this.$ctx.kernel.repository.variant.getDimensionsByVariantIds([item.variantId]);
    const dim = dims[0];
    if (!dim) return null;

    return {
      widthMm: dim.wMm,
      heightMm: dim.hMm,
      lengthMm: dim.lMm,
      displayUnit: dim.displayUnit.toUpperCase(),
    };
  }

  async weight(): Promise<{
    weightGrams: number;
    displayUnit: string;
  } | null> {
    const item = await this.loadItem();
    if (!item) return null;

    const weights = await this.$ctx.kernel.repository.variant.getWeightsByVariantIds([item.variantId]);
    const weight = weights[0];
    if (!weight) return null;

    return {
      weightGrams: weight.weightGr,
      displayUnit: weight.displayUnit.toUpperCase(),
    };
  }

  async stock(): Promise<StockResolver[]> {
    const item = await this.loadItem();
    if (!item) return [];

    const stocks = await this.$ctx.kernel.repository.variant.getStockByVariantIds([item.variantId]);
    return stocks.map((s) => new StockResolver(s.id, this.$ctx));
  }

  async totalAvailable(): Promise<number> {
    const item = await this.loadItem();
    if (!item) return 0;

    const stocks = await this.$ctx.kernel.repository.variant.getStockByVariantIds([item.variantId]);
    return stocks.reduce((sum, s) => {
      const available = s.quantityOnHand - s.reservedQty - s.unavailableQty;
      return sum + Math.max(0, available);
    }, 0);
  }

  async unitCost(): Promise<{
    currency: string;
    amountMinor: number;
    effectiveFrom: string;
  } | null> {
    const item = await this.loadItem();
    if (!item) return null;

    const costs = await this.$ctx.kernel.repository.variant.getActiveCostsByVariantIds([item.variantId]);
    const cost = costs[0];
    if (!cost) return null;

    return {
      currency: cost.currency,
      amountMinor: cost.unitCostMinor,
      effectiveFrom: cost.effectiveFrom,
    };
  }

  async createdAt(): Promise<string | null> {
    const item = await this.loadItem();
    return item?.createdAt ?? null;
  }

  async updatedAt(): Promise<string | null> {
    const item = await this.loadItem();
    return item?.updatedAt ?? null;
  }
}
