import type { TransactionScript } from "../../kernel/types.js";
import type { Variant } from "../../repositories/models/index.js";

export interface VariantSetWeightParams {
  readonly variantId: string;
  readonly weight: {
    readonly value: number; // grams
  };
}

export interface VariantSetWeightResult {
  variant?: Variant;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const variantSetWeight: TransactionScript<
  VariantSetWeightParams,
  VariantSetWeightResult
> = async (params, services) => {
  const { logger, repository } = services;

  try {
    const { variantId, weight } = params;

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

    // 2. Validate weight is positive
    if (weight.value <= 0) {
      return {
        variant: undefined,
        userErrors: [
          {
            message: "Weight must be a positive value",
            field: ["weight", "value"],
            code: "INVALID_WEIGHT",
          },
        ],
      };
    }

    // 3. Upsert weight
    await repository.physical.upsertWeight(variantId, {
      weightGr: weight.value,
    });

    logger.info({ variantId }, "Variant weight set successfully");

    return {
      variant: existingVariant,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "variantSetWeight failed");
    return {
      variant: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
