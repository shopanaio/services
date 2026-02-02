import { and, eq, inArray, isNull } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  variant,
  itemDimensions,
  itemWeight,
  productVariantCostHistory,
  warehouseStock,
  type Variant,
  type NewVariant,
  type ItemDimensions,
  type ItemWeight,
  type ProductVariantCostHistory,
  type WarehouseStock,
} from "../models/index.js";

/**
 * VariantRepository for inventory service.
 *
 * This repository handles inventory-related data lookups by variantId.
 * The variant entity itself is owned by the Catalog service.
 * This repository provides methods to:
 * - Lookup variant by ID (for validation in inventory scripts)
 * - Lookup variant by SKU (for SKU uniqueness check)
 * - Update variant SKU (temporary - will move to InventoryItem)
 * - Get dimensions/weight (physical attributes)
 * - Get stock levels
 * - Get cost history
 *
 * Note: In the future, SKU and other inventory-specific fields will be
 * moved to InventoryItem table, and this repository will be simplified.
 */
export class VariantRepository extends BaseRepository {
  // ============ Variant Lookup (for validation) ============

  async exists(id: string): Promise<boolean> {
    const result = await this.connection
      .select({ id: variant.id })
      .from(variant)
      .where(
        and(
          eq(variant.projectId, this.storeId),
          eq(variant.id, id),
          isNull(variant.deletedAt)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  async findById(id: string): Promise<Variant | null> {
    const result = await this.connection
      .select()
      .from(variant)
      .where(
        and(
          eq(variant.projectId, this.storeId),
          eq(variant.id, id),
          isNull(variant.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findBySku(sku: string): Promise<Variant | null> {
    const result = await this.connection
      .select()
      .from(variant)
      .where(
        and(
          eq(variant.projectId, this.storeId),
          eq(variant.sku, sku),
          isNull(variant.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Update variant SKU.
   * NOTE: This is temporary - SKU will move to InventoryItem in the future.
   */
  async update(
    id: string,
    data: { sku?: string | null }
  ): Promise<Variant | null> {
    const updateData: Partial<NewVariant> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.sku !== undefined) updateData.sku = data.sku;

    const result = await this.connection
      .update(variant)
      .set(updateData)
      .where(and(eq(variant.projectId, this.storeId), eq(variant.id, id)))
      .returning();

    return result[0] ?? null;
  }

  // ============ Dimensions & Weight (Inventory-related) ============

  async getDimensionsByVariantIds(
    variantIds: readonly string[]
  ): Promise<ItemDimensions[]> {
    if (variantIds.length === 0) return [];

    return this.connection
      .select()
      .from(itemDimensions)
      .where(
        and(
          eq(itemDimensions.projectId, this.storeId),
          inArray(itemDimensions.variantId, [...variantIds])
        )
      );
  }

  async getWeightsByVariantIds(
    variantIds: readonly string[]
  ): Promise<ItemWeight[]> {
    if (variantIds.length === 0) return [];

    return this.connection
      .select()
      .from(itemWeight)
      .where(
        and(
          eq(itemWeight.projectId, this.storeId),
          inArray(itemWeight.variantId, [...variantIds])
        )
      );
  }

  // ============ Stock (Inventory-related) ============

  async getStockByVariantIds(
    variantIds: readonly string[]
  ): Promise<WarehouseStock[]> {
    if (variantIds.length === 0) return [];

    return this.connection
      .select()
      .from(warehouseStock)
      .where(
        and(
          eq(warehouseStock.projectId, this.storeId),
          inArray(warehouseStock.variantId, [...variantIds])
        )
      );
  }

  // ============ Cost History (Inventory-related) ============

  async getActiveCostsByVariantIds(
    variantIds: readonly string[]
  ): Promise<ProductVariantCostHistory[]> {
    if (variantIds.length === 0) return [];

    return this.connection
      .select()
      .from(productVariantCostHistory)
      .where(
        and(
          eq(productVariantCostHistory.projectId, this.storeId),
          inArray(productVariantCostHistory.variantId, [...variantIds]),
          isNull(productVariantCostHistory.effectiveTo)
        )
      );
  }
}
