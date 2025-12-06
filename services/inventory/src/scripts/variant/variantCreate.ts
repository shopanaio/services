import type { TransactionScript } from "../../kernel/types.js";
import type { Variant } from "../../repositories/models/index.js";

export interface VariantCreateParams {
  readonly productId: string;
  readonly sku?: string | null;
}

export interface VariantCreateResult {
  variant?: Variant;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const variantCreate: TransactionScript<
  VariantCreateParams,
  VariantCreateResult
> = async (params, services) => {
  const { logger, repository } = services;

  try {
    const { productId, sku } = params;

    // 1. Check if product exists
    const productExists = await repository.product.exists(productId);
    if (!productExists) {
      return {
        variant: undefined,
        userErrors: [
          {
            message: "Product not found",
            field: ["productId"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    // 2. If sku provided, check uniqueness
    if (sku) {
      const existingVariant = await repository.variant.findBySku(sku);
      if (existingVariant) {
        return {
          variant: undefined,
          userErrors: [
            {
              message: `Variant with SKU "${sku}" already exists`,
              field: ["sku"],
              code: "SKU_ALREADY_EXISTS",
            },
          ],
        };
      }
    }

    // 3. Create variant
    const variant = await repository.variant.create(productId, {
      sku: sku ?? null,
    });

    logger.info({ variantId: variant.id, productId }, "Variant created successfully");

    return {
      variant,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "variantCreate failed");
    return {
      variant: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
