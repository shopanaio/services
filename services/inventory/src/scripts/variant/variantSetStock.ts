import type { TransactionScript } from "../../kernel/types.js";
import type { WarehouseStock } from "../../repositories/models/index.js";

export interface VariantSetStockParams {
  readonly variantId: string;
  readonly warehouseId: string;
  readonly quantity: number;
}

export interface VariantSetStockResult {
  stock?: WarehouseStock;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const variantSetStock: TransactionScript<
  VariantSetStockParams,
  VariantSetStockResult
> = async (params, services) => {
  const { logger, repository } = services;

  try {
    const { variantId, warehouseId, quantity } = params;

    // 1. Validate quantity is non-negative
    if (quantity < 0) {
      return {
        stock: undefined,
        userErrors: [
          {
            message: "Quantity must be a non-negative value",
            field: ["quantity"],
            code: "INVALID_QUANTITY",
          },
        ],
      };
    }

    // 2. Check if variant exists
    const variantExists = await repository.variant.exists(variantId);
    if (!variantExists) {
      return {
        stock: undefined,
        userErrors: [
          {
            message: "Variant not found",
            field: ["variantId"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    // 3. Check if warehouse exists
    const warehouseExists = await repository.warehouse.exists(warehouseId);
    if (!warehouseExists) {
      return {
        stock: undefined,
        userErrors: [
          {
            message: "Warehouse not found",
            field: ["warehouseId"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    // 4. Upsert stock (unique: project+warehouse+variant)
    const stock = await repository.stock.upsert(variantId, warehouseId, quantity);

    logger.info({ variantId, warehouseId, quantity }, "Variant stock set successfully");

    return {
      stock,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "variantSetStock failed");
    return {
      stock: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
