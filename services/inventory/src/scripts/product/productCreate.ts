import type { TransactionScript } from "../../kernel/types.js";
import type { Product, Variant } from "../../repositories/models/index.js";

export interface ProductCreateParams {
  readonly publish?: boolean;
}

export interface ProductWithVariants extends Product {
  _variants?: Variant[];
}

export interface ProductCreateResult {
  product?: ProductWithVariants;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const productCreate: TransactionScript<
  ProductCreateParams,
  ProductCreateResult
> = async (params, services) => {
  const { logger, repository } = services;

  try {
    const { publish } = params;

    // 1. Create product
    const product = await repository.product.create({
      publishedAt: publish ? new Date() : null,
    });

    // 2. Create default variant
    const defaultVariant = await repository.variant.create(product.id, {});

    logger.info({ productId: product.id }, "Product created successfully");

    // Return product with _variants for resolver
    const productWithVariants: ProductWithVariants = {
      ...product,
      _variants: [defaultVariant],
    };

    return {
      product: productWithVariants,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "productCreate failed");
    return {
      product: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
