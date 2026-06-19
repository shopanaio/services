import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { ApolloMutation, ZodResolver } from "@shopana/type-resolver";
import { randomUUID } from "crypto";
import { InventoryType } from "./InventoryType.js";
import { WarehouseResolver } from "./WarehouseResolver.js";
import { InventoryItemResolver } from "./InventoryItemResolver.js";
import { StockResolver } from "./StockResolver.js";
import {
  WarehouseCreateScript,
  WarehouseDeleteScript,
  WarehouseUpdateScript,
} from "../../scripts/warehouse/index.js";
import type {
  WarehouseCreateInput,
  WarehouseUpdateInput,
  WarehouseDeleteInput,
} from "./generated/types.js";
import {
  WarehouseCreateInputSchema,
  WarehouseUpdateInputSchema,
  WarehouseDeleteInputSchema,
} from "./generated/schemas.js";

interface InventoryItemUpdateInput {
  id: string;
  sku?: string | null;
  trackInventory?: boolean;
  continueSellingWhenOutOfStock?: boolean;
  dimensions?: {
    widthMm: number;
    heightMm: number;
    lengthMm: number;
  };
  weight?: {
    weightGrams: number;
  };
  stock?: {
    warehouseId: string;
    onHand: number;
    unavailable?: number;
  };
  unitCost?: {
    currency: string;
    amountMinor: number | string;
  };
}

/**
 * Root Mutation resolver.
 * Decorated with @ApolloMutation to create Apollo-compatible resolver proxy.
 */
@ApolloMutation
export class MutationResolver extends InventoryType<Record<string, never>> {
  /**
   * Entry point for inventory-related mutations.
   * Returns namespace resolver that handles all inventory mutations.
   */
  inventoryMutation() {
    return new InventoryMutationResolver({}, this.$ctx);
  }
}

/**
 * InventoryMutation namespace resolver.
 * Handles all inventory-related mutations.
 *
 * After the service split:
 * - Product/Variant/Option/Feature mutations are in Catalog service
 * - This service handles Warehouse and InventoryItem mutations
 */
export class InventoryMutationResolver extends InventoryType<Record<string, never>> {
  // ---- InventoryItem Mutations ----

  /**
   * Update an inventory item.
   * Supports updating: SKU, tracking settings, dimensions, weight, stock, cost.
   */
  async inventoryItemUpdate(args: { input: InventoryItemUpdateInput }) {
    const { input } = args;
    const userErrors: Array<{ message: string; code?: string; field?: string[] }> = [];

    const itemId = decodeGlobalIdByType(
      input.id,
      GlobalIdEntity.InventoryItem
    );

    // Find the inventory item
    const item = await this.$ctx.kernel.repository.inventoryItem.findById(itemId);
    if (!item) {
      return {
        inventoryItem: null,
        userErrors: [{ message: "Inventory item not found", code: "NOT_FOUND", field: ["id"] }],
      };
    }

    // Update basic fields
    const updateData: {
      sku?: string | null;
      trackInventory?: boolean;
      continueSellingWhenOutOfStock?: boolean;
    } = {};

    if (input.sku !== undefined) {
      // Check SKU uniqueness
      if (input.sku !== null && input.sku !== "") {
        const existing = await this.$ctx.kernel.repository.inventoryItem.findBySku(input.sku);
        if (existing && existing.id !== itemId) {
          return {
            inventoryItem: null,
            userErrors: [{ message: `SKU "${input.sku}" is already in use`, code: "SKU_EXISTS", field: ["sku"] }],
          };
        }
      }
      updateData.sku = input.sku;
    }

    if (input.trackInventory !== undefined) {
      updateData.trackInventory = input.trackInventory;
    }

    if (input.continueSellingWhenOutOfStock !== undefined) {
      updateData.continueSellingWhenOutOfStock = input.continueSellingWhenOutOfStock;
    }

    // Update the inventory item
    if (Object.keys(updateData).length > 0) {
      await this.$ctx.kernel.repository.inventoryItem.update(itemId, updateData);
    }

    // Update dimensions if provided
    if (input.dimensions) {
      await this.$ctx.kernel.repository.physical.upsertDimensions(item.variantId, {
        wMm: input.dimensions.widthMm,
        hMm: input.dimensions.heightMm,
        lMm: input.dimensions.lengthMm,
      });
    }

    // Update weight if provided
    if (input.weight) {
      await this.$ctx.kernel.repository.physical.upsertWeight(item.variantId, {
        weightGr: input.weight.weightGrams,
      });
    }

    // Update stock if provided
    if (input.stock) {
      // Validate non-negative quantity
      if (input.stock.onHand < 0) {
        return {
          inventoryItem: null,
          userErrors: [{ message: "Quantity cannot be negative", code: "INVALID_QUANTITY", field: ["stock", "onHand"] }],
        };
      }

      const warehouseId = decodeGlobalIdByType(
        input.stock.warehouseId,
        GlobalIdEntity.Warehouse
      );

      // Validate warehouse exists
      const warehouseExists = await this.$ctx.kernel.repository.warehouse.exists(warehouseId);
      if (!warehouseExists) {
        return {
          inventoryItem: null,
          userErrors: [{ message: "Warehouse not found", code: "NOT_FOUND", field: ["stock", "warehouseId"] }],
        };
      }

      // Get existing stock
      const existingStock = await this.$ctx.kernel.repository.stock.findByVariantWarehouse(
        item.variantId,
        warehouseId
      );

      const currentOnHand = existingStock?.quantityOnHand ?? 0;
      const currentUnavailable = existingStock?.unavailableQty ?? 0;
      const deltaOnHand = input.stock.onHand - currentOnHand;
      const deltaUnavailable = (input.stock.unavailable ?? 0) - currentUnavailable;

      if (deltaOnHand !== 0 || deltaUnavailable !== 0 || !existingStock) {
        const movementType = !existingStock ? "SEED" : "ADJUST";

        await this.$ctx.kernel.repository.stock.applyStockChange({
          variantId: item.variantId,
          warehouseId,
          deltaOnHand,
          deltaUnavailable,
          movementType,
          reason: movementType === "ADJUST" ? "MANUAL" : null,
          sourceSystem: "INVENTORY_ADMIN",
          sourceEventId: randomUUID(),
          createdBy: this.$ctx.hasUser ? this.$ctx.user.id : null,
        });
      }
    }

    // Update cost if provided
    if (input.unitCost) {
      await this.$ctx.kernel.repository.cost.setCost(item.variantId, {
        currency: input.unitCost.currency as "UAH" | "USD" | "EUR",
        unitCostMinor: Number(input.unitCost.amountMinor),
      });
    }

    return {
      inventoryItem: new InventoryItemResolver(itemId, this.$ctx),
      userErrors,
    };
  }

  // ---- Warehouse Mutations ----

  /**
   * Create a new warehouse.
   */
  @ZodResolver(WarehouseCreateInputSchema())
  async warehouseCreate(args: { input: WarehouseCreateInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(WarehouseCreateScript, {
      code: input.code,
      name: input.name,
      isDefault: input.isDefault ?? undefined,
    });

    return {
      warehouse: result.warehouse
        ? new WarehouseResolver(result.warehouse.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Update an existing warehouse.
   */
  @ZodResolver(WarehouseUpdateInputSchema())
  async warehouseUpdate(args: { input: WarehouseUpdateInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(WarehouseUpdateScript, {
      id: input.id,
      code: input.code ?? undefined,
      name: input.name ?? undefined,
      isDefault: input.isDefault ?? undefined,
    });

    return {
      warehouse: result.warehouse
        ? new WarehouseResolver(result.warehouse.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Delete a warehouse.
   */
  @ZodResolver(WarehouseDeleteInputSchema())
  async warehouseDelete(args: { input: WarehouseDeleteInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(WarehouseDeleteScript, {
      id: input.id,
    });

    return {
      deletedWarehouseId: result.deletedWarehouseId ?? null,
      userErrors: result.userErrors,
    };
  }
}
