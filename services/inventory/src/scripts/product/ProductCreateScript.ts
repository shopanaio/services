import { BaseScript } from "../../kernel/BaseScript.js";
import type { ProductCreateParams, ProductCreateResult } from "./dto/index.js";

export class ProductCreateScript extends BaseScript<ProductCreateParams, ProductCreateResult> {
  protected async execute(_params: ProductCreateParams): Promise<ProductCreateResult> {
    // 1. Create empty product
    const product = await this.repository.product.create({});

    // 2. Create default variant (empty handle = no options)
    const defaultVariant = await this.repository.variant.create(product.id, {
      isDefault: true,
      handle: "",
    });

    this.logger.info({ productId: product.id }, "Product created");

    return {
      product: { ...product, _variants: [defaultVariant] },
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): ProductCreateResult {
    return {
      product: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
