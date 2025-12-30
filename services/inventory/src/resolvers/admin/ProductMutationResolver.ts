import { ZodResolver } from "@shopana/type-resolver";
import { InventoryType } from "./InventoryType.js";
import { ProductResolver } from "./ProductResolver.js";
import {
  ProductCreateScript,
  ProductUpdateScript,
  ProductDeleteScript,
  ProductPublishScript,
  ProductUnpublishScript,
} from "../../scripts/product/index.js";
import type {
  ProductUpdateInput,
  ProductDeleteInput,
  ProductPublishInput,
  ProductUnpublishInput,
} from "./generated/types.js";
import {
  ProductUpdateInputSchema,
  ProductDeleteInputSchema,
  ProductPublishInputSchema,
  ProductUnpublishInputSchema,
} from "./generated/schemas.js";

/**
 * ProductMutation namespace resolver.
 * Handles all product-related mutations.
 */
export class ProductMutationResolver extends InventoryType<Record<string, never>> {
  /**
   * Create a new product.
   */
  async productCreate() {
    const result = await this.ctx.kernel.runScript(ProductCreateScript, {});

    return {
      product: result.product
        ? new ProductResolver(result.product.id, this.ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Update an existing product.
   */
  @ZodResolver(ProductUpdateInputSchema())
  async productUpdate(args: { input: ProductUpdateInput }) {
    const { input } = args;

    const result = await this.ctx.kernel.runScript(ProductUpdateScript, {
      id: input.id,
      handle: input.handle ?? undefined,
      title: input.title ?? undefined,
      description: input.description
        ? {
            text: input.description.text,
            html: input.description.html,
            json: input.description.json as Record<string, unknown>,
          }
        : undefined,
      excerpt: input.excerpt ?? undefined,
      seoTitle: input.seoTitle ?? undefined,
      seoDescription: input.seoDescription ?? undefined,
    });

    return {
      product: result.product
        ? new ProductResolver(result.product.id, this.ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Delete a product.
   */
  @ZodResolver(ProductDeleteInputSchema())
  async productDelete(args: { input: ProductDeleteInput }) {
    const { input } = args;

    const result = await this.ctx.kernel.runScript(ProductDeleteScript, {
      id: input.id,
      permanent: input.permanent ?? undefined,
    });

    return {
      deletedProductId: result.deletedProductId ?? null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Publish a product.
   */
  @ZodResolver(ProductPublishInputSchema())
  async productPublish(args: { input: ProductPublishInput }) {
    const { input } = args;

    const result = await this.ctx.kernel.runScript(ProductPublishScript, {
      id: input.id,
    });

    return {
      product: result.product
        ? new ProductResolver(result.product.id, this.ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Unpublish a product.
   */
  @ZodResolver(ProductUnpublishInputSchema())
  async productUnpublish(args: { input: ProductUnpublishInput }) {
    const { input } = args;

    const result = await this.ctx.kernel.runScript(ProductUnpublishScript, {
      id: input.id,
    });

    return {
      product: result.product
        ? new ProductResolver(result.product.id, this.ctx)
        : null,
      userErrors: result.userErrors,
    };
  }
}
