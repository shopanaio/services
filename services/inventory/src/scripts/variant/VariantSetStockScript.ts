import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import type { WarehouseStock } from "../../repositories/models/index.js";

export interface VariantSetStockParams {
  readonly variantId: string;
  readonly warehouseId: string;
  readonly quantity: number;
}

export interface VariantSetStockResult {
  stock?: WarehouseStock;
  userErrors: UserError[];
}

export class VariantSetStockScript extends BaseScript<VariantSetStockParams, VariantSetStockResult> {
  protected async execute(params: VariantSetStockParams): Promise<VariantSetStockResult> {
    const { variantId, warehouseId, quantity } = params;

    if (quantity < 0) {
      return {
        stock: undefined,
        userErrors: [{ message: "Quantity must be a non-negative value", field: ["quantity"], code: "INVALID_QUANTITY" }],
      };
    }

    const variantExists = await this.repository.variant.exists(variantId);
    if (!variantExists) {
      return {
        stock: undefined,
        userErrors: [{ message: "Variant not found", field: ["variantId"], code: "NOT_FOUND" }],
      };
    }

    const warehouseExists = await this.repository.warehouse.exists(warehouseId);
    if (!warehouseExists) {
      return {
        stock: undefined,
        userErrors: [{ message: "Warehouse not found", field: ["warehouseId"], code: "NOT_FOUND" }],
      };
    }

    const stock = await this.repository.stock.upsert(variantId, warehouseId, quantity);

    this.logger.info({ variantId, warehouseId, quantity }, "Variant stock set successfully");

    return { stock, userErrors: [] };
  }

  protected handleError(_error: unknown): VariantSetStockResult {
    return {
      stock: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
