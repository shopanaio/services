import { and, eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "../BaseRepository.js";
import {
  inventoryItem,
  type InventoryItem,
  type NewInventoryItem,
} from "../models/index.js";

/**
 * InventoryItemRepository - manages InventoryItem entities.
 *
 * InventoryItem has a 1:1 relationship with Variant from Catalog service.
 * This repository provides methods to:
 * - Create/update/delete inventory items
 * - Lookup by ID or variantId
 * - Manage SKU and inventory tracking settings
 */
export class InventoryItemRepository extends BaseRepository {
  // ============ CRUD ============

  async create(data: {
    variantId: string;
    sku?: string | null;
    trackInventory?: boolean;
    continueSellingWhenOutOfStock?: boolean;
  }): Promise<InventoryItem> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const newItem: NewInventoryItem = {
      id,
      projectId: this.storeId,
      variantId: data.variantId,
      sku: data.sku ?? null,
      trackInventory: data.trackInventory ?? true,
      continueSellingWhenOutOfStock: data.continueSellingWhenOutOfStock ?? false,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.connection
      .insert(inventoryItem)
      .values(newItem)
      .returning();

    return result[0];
  }

  async update(
    id: string,
    data: {
      sku?: string | null;
      trackInventory?: boolean;
      continueSellingWhenOutOfStock?: boolean;
    }
  ): Promise<InventoryItem | null> {
    const updateData: Partial<NewInventoryItem> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.trackInventory !== undefined) updateData.trackInventory = data.trackInventory;
    if (data.continueSellingWhenOutOfStock !== undefined) {
      updateData.continueSellingWhenOutOfStock = data.continueSellingWhenOutOfStock;
    }

    const result = await this.connection
      .update(inventoryItem)
      .set(updateData)
      .where(
        and(
          eq(inventoryItem.projectId, this.storeId),
          eq(inventoryItem.id, id)
        )
      )
      .returning();

    return result[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.connection
      .delete(inventoryItem)
      .where(
        and(
          eq(inventoryItem.projectId, this.storeId),
          eq(inventoryItem.id, id)
        )
      )
      .returning({ id: inventoryItem.id });

    return result.length > 0;
  }

  // ============ Lookup ============

  async findById(id: string): Promise<InventoryItem | null> {
    const result = await this.connection
      .select()
      .from(inventoryItem)
      .where(
        and(
          eq(inventoryItem.projectId, this.storeId),
          eq(inventoryItem.id, id)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findByVariantId(variantId: string): Promise<InventoryItem | null> {
    const result = await this.connection
      .select()
      .from(inventoryItem)
      .where(
        and(
          eq(inventoryItem.projectId, this.storeId),
          eq(inventoryItem.variantId, variantId)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findBySku(sku: string): Promise<InventoryItem | null> {
    const result = await this.connection
      .select()
      .from(inventoryItem)
      .where(
        and(
          eq(inventoryItem.projectId, this.storeId),
          eq(inventoryItem.sku, sku)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  // ============ Batch Loaders ============

  async findByIds(ids: readonly string[]): Promise<InventoryItem[]> {
    if (ids.length === 0) return [];

    return this.connection
      .select()
      .from(inventoryItem)
      .where(
        and(
          eq(inventoryItem.projectId, this.storeId),
          inArray(inventoryItem.id, [...ids])
        )
      );
  }

  async findByVariantIds(variantIds: readonly string[]): Promise<InventoryItem[]> {
    if (variantIds.length === 0) return [];

    return this.connection
      .select()
      .from(inventoryItem)
      .where(
        and(
          eq(inventoryItem.projectId, this.storeId),
          inArray(inventoryItem.variantId, [...variantIds])
        )
      );
  }

  // ============ Upsert (for event handlers) ============

  /**
   * Create or update inventory item for a variant.
   * Used when receiving variant.created events from Catalog.
   */
  async upsertByVariantId(
    variantId: string,
    data: {
      sku?: string | null;
      trackInventory?: boolean;
      continueSellingWhenOutOfStock?: boolean;
    }
  ): Promise<InventoryItem> {
    const existing = await this.findByVariantId(variantId);

    if (existing) {
      const updated = await this.update(existing.id, data);
      return updated!;
    }

    return this.create({
      variantId,
      ...data,
    });
  }
}
