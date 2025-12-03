import type { TransactionScript } from "../../kernel/types.js";

export interface VariantSetMediaParams {
  readonly id: string;
  readonly mediaIds: string[];
}

export interface VariantSetMediaResult {
  variant?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const variantSetMedia: TransactionScript<
  VariantSetMediaParams,
  VariantSetMediaResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "variantSetMedia: not implemented");

    return {
      variant: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "variantSetMedia failed");
    return {
      variant: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
