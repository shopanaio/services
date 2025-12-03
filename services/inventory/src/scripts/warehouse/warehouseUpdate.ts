import type { TransactionScript } from "../../kernel/types.js";

export interface WarehouseUpdateParams {
  readonly id: string;
  readonly name?: string;
  readonly address?: string;
  readonly isDefault?: boolean;
}

export interface WarehouseUpdateResult {
  warehouse?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const warehouseUpdate: TransactionScript<
  WarehouseUpdateParams,
  WarehouseUpdateResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "warehouseUpdate: not implemented");

    return {
      warehouse: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "warehouseUpdate failed");
    return {
      warehouse: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
