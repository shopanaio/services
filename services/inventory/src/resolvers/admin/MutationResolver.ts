import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { ApolloMutation, ZodResolver } from "@shopana/type-resolver";
import { InventoryType } from "./InventoryType.js";
import { WarehouseResolver } from "./WarehouseResolver.js";
import { InventoryItemResolver } from "./InventoryItemResolver.js";
import { InventoryItemUpdateScript } from "../../scripts/inventory-item/index.js";
import {
  WarehouseCreateScript,
  WarehouseDeleteScript,
  WarehouseUpdateScript,
} from "../../scripts/warehouse/index.js";
import type {
  InventoryItemUpdateInput,
  WarehouseCreateInput,
  WarehouseUpdateInput,
  WarehouseDeleteInput,
} from "./generated/types.js";
import {
  InventoryItemUpdateInputSchema,
  WarehouseCreateInputSchema,
  WarehouseUpdateInputSchema,
  WarehouseDeleteInputSchema,
} from "./generated/schemas.js";

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
  @ZodResolver(InventoryItemUpdateInputSchema())
  async inventoryItemUpdate(args: { input: InventoryItemUpdateInput }) {
    const { input } = args;

    const itemId = decodeGlobalIdByType(
      input.id,
      GlobalIdEntity.InventoryItem,
    );

    const item = await this.$ctx.kernel.repository.inventoryItem.findById(itemId);
    if (!item) {
      return {
        inventoryItem: null,
        userErrors: [{ message: "Inventory item not found", code: "NOT_FOUND", field: ["id"] }],
      };
    }

    const stock = input.stock
      ? {
          warehouseId: decodeGlobalIdByType(
            input.stock.warehouseId,
            GlobalIdEntity.Warehouse,
          ),
          onHand: input.stock.onHand,
          unavailable: input.stock.unavailable,
        }
      : undefined;

    const result = await this.$ctx.kernel.runScript(InventoryItemUpdateScript, {
      inventoryItemId: item.id,
      variantId: item.variantId,
      sku: input.sku,
      trackInventory: input.trackInventory ?? undefined,
      continueSellingWhenOutOfStock:
        input.continueSellingWhenOutOfStock ?? undefined,
      dimensions: input.dimensions
        ? {
            widthMm: input.dimensions.widthMm,
            heightMm: input.dimensions.heightMm,
            lengthMm: input.dimensions.lengthMm,
          }
        : undefined,
      weight: input.weight
        ? {
            weightGrams: input.weight.weightGrams,
          }
        : undefined,
      stock,
      unitCost: input.unitCost
        ? {
            currency: input.unitCost.currency,
            amountMinor: input.unitCost.amountMinor,
          }
        : undefined,
    });

    return {
      inventoryItem:
        result.userErrors.length === 0
          ? new InventoryItemResolver(item.id, this.$ctx)
          : null,
      userErrors: result.userErrors,
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
    const warehouseId = decodeGlobalIdByType(
      input.id,
      GlobalIdEntity.Warehouse,
    );

    const result = await this.$ctx.kernel.runScript(WarehouseUpdateScript, {
      id: warehouseId,
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
    const warehouseId = decodeGlobalIdByType(
      input.id,
      GlobalIdEntity.Warehouse,
    );

    const result = await this.$ctx.kernel.runScript(WarehouseDeleteScript, {
      id: warehouseId,
    });

    return {
      deletedWarehouseId: result.deletedWarehouseId
        ? encodeGlobalIdByType(
            result.deletedWarehouseId,
            GlobalIdEntity.Warehouse,
          )
        : null,
      userErrors: result.userErrors,
    };
  }
}
