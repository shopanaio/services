import type { TransactionScript } from "../../kernel/types.js";

export interface VariantDeleteParams {
  readonly id: string;
}

export interface VariantDeleteResult {
  deletedVariantId?: string;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const variantDelete: TransactionScript<
  VariantDeleteParams,
  VariantDeleteResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "variantDelete: not implemented");

    return {
      deletedVariantId: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "variantDelete failed");
    return {
      deletedVariantId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
