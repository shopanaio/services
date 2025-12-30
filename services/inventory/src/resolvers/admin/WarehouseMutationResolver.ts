import { ZodResolver } from "@shopana/type-resolver";
import { InventoryType } from "./InventoryType.js";
import { WarehouseResolver } from "./WarehouseResolver.js";
import {
  warehouseCreate,
  warehouseDelete,
  warehouseUpdate,
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

/**
 * WarehouseMutation namespace resolver.
 * Handles all warehouse-related mutations.
 */
export class WarehouseMutationResolver extends InventoryType<Record<string, never>> {
  /**
   * Create a new warehouse.
   */
  @ZodResolver(WarehouseCreateInputSchema())
  async warehouseCreate(args: { input: WarehouseCreateInput }) {
    const { input } = args;

    const result = await this.ctx.kernel.executeScript(warehouseCreate, {
      code: input.code,
      name: input.name,
      isDefault: input.isDefault ?? undefined,
    });

    return {
      warehouse: result.warehouse
        ? new WarehouseResolver(result.warehouse.id, this.ctx)
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

    const result = await this.ctx.kernel.executeScript(warehouseUpdate, {
      id: input.id,
      code: input.code ?? undefined,
      name: input.name ?? undefined,
      isDefault: input.isDefault ?? undefined,
    });

    return {
      warehouse: result.warehouse
        ? new WarehouseResolver(result.warehouse.id, this.ctx)
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

    const result = await this.ctx.kernel.executeScript(warehouseDelete, {
      id: input.id,
    });

    return {
      deletedWarehouseId: result.deletedWarehouseId ?? null,
      userErrors: result.userErrors,
    };
  }
}
