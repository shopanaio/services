import type { TransactionScript } from "../../kernel/types.js";

export interface WarehouseCreateParams {
  readonly name: string;
  readonly address?: string;
  readonly isDefault?: boolean;
}

export interface WarehouseCreateResult {
  warehouse?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const warehouseCreate: TransactionScript<
  WarehouseCreateParams,
  WarehouseCreateResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "warehouseCreate: not implemented");

    return {
      warehouse: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "warehouseCreate failed");
    return {
      warehouse: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
