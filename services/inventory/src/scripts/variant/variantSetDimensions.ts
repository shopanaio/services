import type { TransactionScript } from "../../kernel/types.js";

export interface VariantSetDimensionsParams {
  readonly id: string;
  readonly length?: number;
  readonly width?: number;
  readonly height?: number;
}

export interface VariantSetDimensionsResult {
  variant?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const variantSetDimensions: TransactionScript<
  VariantSetDimensionsParams,
  VariantSetDimensionsResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "variantSetDimensions: not implemented");

    return {
      variant: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "variantSetDimensions failed");
    return {
      variant: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
