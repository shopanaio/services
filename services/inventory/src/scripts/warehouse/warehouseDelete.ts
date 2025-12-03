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
  const { logger } = services;

  try {
    logger.info({ params }, "warehouseDelete: not implemented");

    return {
      deletedWarehouseId: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "warehouseDelete failed");
    return {
      deletedWarehouseId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
