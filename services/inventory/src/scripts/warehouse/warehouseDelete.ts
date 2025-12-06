import type { TransactionScript } from "../../kernel/types.js";

export interface WarehouseDeleteParams {
  readonly id: string;
}

export interface WarehouseDeleteResult {
  deletedWarehouseId?: string;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const warehouseDelete: TransactionScript<
  WarehouseDeleteParams,
  WarehouseDeleteResult
> = async (params, services) => {
  const { logger, repository } = services;

  try {
    const { id } = params;

    // 1. Check if warehouse exists
    const existing = await repository.warehouse.findById(id);
    if (!existing) {
      return {
        deletedWarehouseId: undefined,
        userErrors: [
          {
            message: "Warehouse not found",
            field: ["id"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    // 2. Delete warehouse (CASCADE will delete warehouse_stock)
    const deleted = await repository.warehouse.delete(id);

    if (!deleted) {
      return {
        deletedWarehouseId: undefined,
        userErrors: [
          {
            message: "Failed to delete warehouse",
            code: "DELETE_FAILED",
          },
        ],
      };
    }

    logger.info({ warehouseId: id }, "Warehouse deleted successfully");

    return {
      deletedWarehouseId: id,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "warehouseDelete failed");
    return {
      deletedWarehouseId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
