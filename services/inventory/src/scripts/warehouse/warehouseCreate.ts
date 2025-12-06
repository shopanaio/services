import type { TransactionScript } from "../../kernel/types.js";
import type { Warehouse } from "../../repositories/models/index.js";

export interface WarehouseCreateParams {
  readonly code: string;
  readonly name: string;
  readonly isDefault?: boolean;
}

export interface WarehouseCreateResult {
  warehouse?: Warehouse;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const warehouseCreate: TransactionScript<
  WarehouseCreateParams,
  WarehouseCreateResult
> = async (params, services) => {
  const { logger, repository } = services;

  try {
    const { code, name, isDefault } = params;

    // 1. Check if code is unique for this project
    const existing = await repository.warehouse.findByCode(code);
    if (existing) {
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

    // 2. If isDefault=true, clear existing default
    if (isDefault) {
      await repository.warehouse.clearDefault();
    }

    // 3. Create warehouse
    const warehouse = await repository.warehouse.create({
      code,
      name,
      isDefault: isDefault ?? false,
    });

    logger.info({ warehouseId: warehouse.id }, "Warehouse created successfully");

    return {
      warehouse,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "warehouseCreate failed");
    return {
      warehouse: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
