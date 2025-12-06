import type { TransactionScript } from "../../kernel/types.js";
import type { Variant } from "../../repositories/models/index.js";

export interface VariantSetDimensionsParams {
  readonly variantId: string;
  readonly dimensions: {
    readonly width: number;  // mm
    readonly length: number; // mm
    readonly height: number; // mm
  };
}

export interface VariantSetDimensionsResult {
  variant?: Variant;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const variantSetDimensions: TransactionScript<
  VariantSetDimensionsParams,
  VariantSetDimensionsResult
> = async (params, services) => {
  const { logger, repository } = services;

  try {
    const { variantId, dimensions } = params;

    // 1. Check if variant exists
    const existingVariant = await repository.variant.findById(variantId);
    if (!existingVariant) {
      return {
        variant: undefined,
        userErrors: [
          {
            message: "Variant not found",
            field: ["variantId"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    // 2. Validate dimensions are positive
    if (dimensions.width <= 0 || dimensions.length <= 0 || dimensions.height <= 0) {
      return {
        variant: undefined,
        userErrors: [
          {
            message: "All dimensions must be positive values",
            field: ["dimensions"],
            code: "INVALID_DIMENSIONS",
          },
        ],
      };
    }

    // 3. Upsert dimensions
    await repository.physical.upsertDimensions(variantId, {
      wMm: dimensions.width,
      lMm: dimensions.length,
      hMm: dimensions.height,
    });

    logger.info({ variantId }, "Variant dimensions set successfully");

    return {
      variant: existingVariant,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "variantSetDimensions failed");
    return {
      variant: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
