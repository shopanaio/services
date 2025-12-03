import type { TransactionScript } from "../../kernel/types.js";

export interface VariantSetWeightParams {
  readonly id: string;
  readonly weight: number;
  readonly weightUnit?: string;
}

export interface VariantSetWeightResult {
  variant?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const variantSetWeight: TransactionScript<
  VariantSetWeightParams,
  VariantSetWeightResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "variantSetWeight: not implemented");

    return {
      variant: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "variantSetWeight failed");
    return {
      variant: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
