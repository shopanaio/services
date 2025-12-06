import type { TransactionScript } from "../../kernel/types.js";
import type { Variant } from "../../repositories/models/index.js";

export interface VariantSetSkuParams {
  readonly variantId: string;
  readonly sku: string;
}

export interface VariantSetSkuResult {
  variant?: Variant;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const variantSetSku: TransactionScript<
  VariantSetSkuParams,
  VariantSetSkuResult
> = async (params, services) => {
  const { logger, repository } = services;

  try {
    const { variantId, sku } = params;

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

    // 2. Check if SKU is already taken by another variant
    const variantWithSku = await repository.variant.findBySku(sku);
    if (variantWithSku && variantWithSku.id !== variantId) {
      return {
        variant: undefined,
        userErrors: [
          {
            message: `SKU "${sku}" is already in use`,
            field: ["sku"],
            code: "SKU_ALREADY_EXISTS",
          },
        ],
      };
    }

    // 3. Update SKU
    const variant = await repository.variant.update(variantId, { sku });
    if (!variant) {
      return {
        variant: undefined,
        userErrors: [
          {
            message: "Failed to update SKU",
            code: "UPDATE_FAILED",
          },
        ],
      };
    }

    logger.info({ variantId, sku }, "Variant SKU updated successfully");

    return {
      variant,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "variantSetSku failed");
    return {
      variant: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
