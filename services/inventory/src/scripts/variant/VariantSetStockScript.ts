import { randomUUID } from "crypto";
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

    const existingStock = await this.repository.stock.findByVariantWarehouse(
      variantId,
      warehouseId
    );
    const currentQuantity = existingStock?.quantityOnHand ?? 0;
    const deltaOnHand = quantity - currentQuantity;

    if (deltaOnHand === 0 && existingStock) {
      return { stock: existingStock, userErrors: [] };
    }

    const movementType = deltaOnHand === 0 ? "SEED" : "ADJUST";
    const applyResult = await this.repository.stock.applyStockChange({
      variantId,
      warehouseId,
      deltaOnHand,
      movementType,
      reason: movementType === "ADJUST" ? "MANUAL" : null,
      sourceSystem: "INVENTORY_ADMIN",
      sourceEventId: randomUUID(),
      createdBy: this.context.hasUser ? this.context.user.id : null,
    });

    if (applyResult.status === "REJECTED") {
      return {
        stock: undefined,
        userErrors: [
          {
            message: "Stock update rejected",
            field: ["quantity"],
            code: "STOCK_REJECTED",
          },
        ],
      };
    }

    const stock = await this.repository.stock.findByVariantWarehouse(
      variantId,
      warehouseId
    );

    if (!stock) {
      return {
        stock: undefined,
        userErrors: [
          {
            message: "Stock record not found after update",
            code: "NOT_FOUND",
          },
        ],
      };
    }

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
