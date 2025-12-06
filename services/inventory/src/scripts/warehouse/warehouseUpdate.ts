import type { TransactionScript } from "../../kernel/types.js";
import type { Warehouse } from "../../repositories/models/index.js";

export interface WarehouseUpdateParams {
  readonly id: string;
  readonly code?: string;
  readonly name?: string;
  readonly isDefault?: boolean;
}

export interface WarehouseUpdateResult {
  warehouse?: Warehouse;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const warehouseUpdate: TransactionScript<
  WarehouseUpdateParams,
  WarehouseUpdateResult
> = async (params, services) => {
  const { logger, repository } = services;

  try {
    const { id, code, name, isDefault } = params;

    // 1. Check if warehouse exists
    const existing = await repository.warehouse.findById(id);
    if (!existing) {
      return {
        warehouse: undefined,
        userErrors: [
          {
            message: "Warehouse not found",
            field: ["id"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    // 2. If code is changing, check uniqueness
    if (code !== undefined && code !== existing.code) {
      const codeExists = await repository.warehouse.findByCode(code);
      if (codeExists) {
        return {
          warehouse: undefined,
          userErrors: [
            {
              message: `Warehouse with code "${code}" already exists`,
              field: ["code"],
              code: "CODE_ALREADY_EXISTS",
            },
          ],
        };
      }
    }

    // 3. If isDefault=true, clear existing default
    if (isDefault === true) {
      await repository.warehouse.clearDefault();
    }

    // 4. Update warehouse
    const warehouse = await repository.warehouse.update(id, {
      code,
      name,
      isDefault,
    });

    if (!warehouse) {
      return {
        warehouse: undefined,
        userErrors: [
          {
            message: "Failed to update warehouse",
            code: "UPDATE_FAILED",
          },
        ],
      };
    }

    logger.info({ warehouseId: warehouse.id }, "Warehouse updated successfully");

    return {
      warehouse,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "warehouseUpdate failed");
    return {
      warehouse: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
