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

  console.log("[warehouseCreate script] Starting with params:", JSON.stringify(params));
  console.log("[warehouseCreate script] repository exists:", !!repository);
  console.log("[warehouseCreate script] repository.warehouse exists:", !!repository?.warehouse);

  try {
    const { code, name, isDefault } = params;

    // 1. Check if code is unique for this project
    console.log("[warehouseCreate script] Checking for existing warehouse with code:", code);
    const existing = await repository.warehouse.findByCode(code);
    console.log("[warehouseCreate script] Existing warehouse:", existing);

    if (existing) {
      console.log("[warehouseCreate script] Code already exists, returning error");
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
      console.log("[warehouseCreate script] Clearing existing default warehouses");
      await repository.warehouse.clearDefault();
    }

    // 3. Create warehouse
    console.log("[warehouseCreate script] Creating warehouse...");
    const warehouse = await repository.warehouse.create({
      code,
      name,
      isDefault: isDefault ?? false,
    });

    console.log("[warehouseCreate script] Created warehouse:", JSON.stringify(warehouse));
    console.log("[warehouseCreate script] warehouse.id:", warehouse?.id);

    logger.info({ warehouseId: warehouse.id }, "Warehouse created successfully");

    return {
      warehouse,
      userErrors: [],
    };
  } catch (error) {
    console.log("[warehouseCreate script] ERROR:", error);
    logger.error({ error }, "warehouseCreate failed");
    return {
      warehouse: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
