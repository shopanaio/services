import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { ApolloMutation, ZodResolver } from "@shopana/type-resolver";
import { InventoryType } from "./InventoryType.js";
import { ProductResolver } from "./ProductResolver.js";
import { VariantResolver } from "./VariantResolver.js";
import { WarehouseResolver } from "./WarehouseResolver.js";
import { OptionResolver } from "./OptionResolver.js";
import { FeatureResolver } from "./FeatureResolver.js";
import { StockResolver } from "./StockResolver.js";
import { DBOS } from "@shopana/workflows";
import {
  ProductUpdateScript,
  ProductDeleteScript,
  ProductPublishScript,
  ProductUnpublishScript,
} from "../../scripts/product/index.js";
import { ProductCreateWorkflow } from "../../workflows/index.js";
import {
  VariantCreateScript,
  VariantDeleteScript,
  VariantSetCostScript,
  VariantSetDimensionsScript,
  VariantSetMediaScript,
  VariantSetPricingScript,
  VariantSetSkuScript,
  VariantSetStockScript,
  VariantSetWeightScript,
} from "../../scripts/variant/index.js";
import {
  WarehouseCreateScript,
  WarehouseDeleteScript,
  WarehouseUpdateScript,
} from "../../scripts/warehouse/index.js";
import {
  OptionCreateScript,
  OptionDeleteScript,
  OptionUpdateScript,
} from "../../scripts/option/index.js";
import {
  FeatureCreateScript,
  FeatureUpdateScript,
  FeatureDeleteScript,
} from "../../scripts/feature/index.js";
import type {
  ProductCreateInput,
  ProductUpdateInput,
  ProductDeleteInput,
  ProductPublishInput,
  ProductUnpublishInput,
  VariantCreateInput,
  VariantDeleteInput,
  VariantSetSkuInput,
  VariantSetDimensionsInput,
  VariantSetWeightInput,
  VariantSetPricingInput,
  VariantSetCostInput,
  VariantSetStockInput,
  VariantSetMediaInput,
  WarehouseCreateInput,
  WarehouseUpdateInput,
  WarehouseDeleteInput,
  ProductOptionCreateInput,
  ProductOptionUpdateInput,
  ProductOptionDeleteInput,
  ProductFeatureCreateInput,
  ProductFeatureUpdateInput,
  ProductFeatureDeleteInput,
} from "./generated/types.js";
import {
  ProductCreateInputSchema,
  ProductUpdateInputSchema,
  ProductDeleteInputSchema,
  ProductPublishInputSchema,
  ProductUnpublishInputSchema,
  VariantCreateInputSchema,
  VariantDeleteInputSchema,
  VariantSetSkuInputSchema,
  VariantSetDimensionsInputSchema,
  VariantSetWeightInputSchema,
  VariantSetPricingInputSchema,
  VariantSetCostInputSchema,
  VariantSetStockInputSchema,
  VariantSetMediaInputSchema,
  WarehouseCreateInputSchema,
  WarehouseUpdateInputSchema,
  WarehouseDeleteInputSchema,
  ProductOptionCreateInputSchema,
  ProductOptionUpdateInputSchema,
  ProductOptionDeleteInputSchema,
  ProductFeatureCreateInputSchema,
  ProductFeatureUpdateInputSchema,
  ProductFeatureDeleteInputSchema,
} from "./generated/schemas.js";

/**
 * Root Mutation resolver.
 * Decorated with @ApolloMutation to create Apollo-compatible resolver proxy.
 */
@ApolloMutation
export class MutationResolver extends InventoryType<Record<string, never>> {
  /**
   * Entry point for inventory-related mutations.
   * Returns namespace resolver that handles all inventory mutations.
   */
  inventoryMutation() {
    return new InventoryMutationResolver({}, this.$ctx);
  }
}

/**
 * InventoryMutation namespace resolver.
 * Handles all inventory-related mutations.
 */
export class InventoryMutationResolver extends InventoryType<Record<string, never>> {
  // ---- Product Mutations ----

  /**
   * Create a new product with all its data in one request.
   * Uses ProductCreateWorkflow to ensure back-refs are synced only after DB commit.
   */
  @ZodResolver(ProductCreateInputSchema())
  async productCreate(args: { input: ProductCreateInput }) {
    const { input } = args;

    // Decode Global IDs to UUIDs for media files
    const mediaFileIds = input.mediaFileIds?.map((fileId) =>
      decodeGlobalIdByType(fileId, GlobalIdEntity.File)
    );

    // Get workflow instance and run it
    const workflow =
      this.$ctx.kernel.workflow.get<ProductCreateWorkflow>("productCreate");
    const handle = await DBOS.startWorkflow(workflow).run({
      title: input.title,
      handle: input.handle,
      description: input.description
        ? {
            text: input.description.text,
            html: input.description.html,
            json: input.description.json as Record<string, unknown>,
          }
        : undefined,
      mediaFileIds,
      options: input.options?.map((opt) => ({
        name: opt.name,
        slug: opt.slug,
        displayType: opt.displayType ?? undefined,
        values: opt.values.map((v) => ({
          name: v.name,
          slug: v.slug,
        })),
      })),
      variants: input.variants?.map((v) => ({
        handle: v.handle,
      })),
    });
    const result = await handle.getResult();

    return {
      product: result.product
        ? new ProductResolver(result.product.id, this.$ctx)
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

    const result = await this.$ctx.kernel.runScript(ProductUpdateScript, {
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
      seo: input.seo
        ? {
            seoTitle: input.seo.seoTitle ?? undefined,
            seoDescription: input.seo.seoDescription ?? undefined,
            ogTitle: input.seo.ogTitle ?? undefined,
            ogDescription: input.seo.ogDescription ?? undefined,
            ogImageId: input.seo.ogImageId ?? undefined,
          }
        : undefined,
    });

    return {
      product: result.product
        ? new ProductResolver(result.product.id, this.$ctx)
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

    const result = await this.$ctx.kernel.runScript(ProductDeleteScript, {
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

    const result = await this.$ctx.kernel.runScript(ProductPublishScript, {
      id: input.id,
    });

    return {
      product: result.product
        ? new ProductResolver(result.product.id, this.$ctx)
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

    const result = await this.$ctx.kernel.runScript(ProductUnpublishScript, {
      id: input.id,
    });

    return {
      product: result.product
        ? new ProductResolver(result.product.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  // ---- Variant Mutations ----

  /**
   * Create a new variant.
   */
  @ZodResolver(VariantCreateInputSchema())
  async variantCreate(args: { input: VariantCreateInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(VariantCreateScript, {
      productId: input.productId,
      options: input.variant.options.map((opt) => ({
        optionId: opt.optionId,
        optionValueId: opt.optionValueId,
      })),
      sku: input.variant.sku ?? undefined,
      externalSystem: input.variant.externalSystem ?? undefined,
      externalId: input.variant.externalId ?? undefined,
    });

    return {
      variant: result.variant
        ? new VariantResolver(result.variant.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Delete a variant.
   */
  @ZodResolver(VariantDeleteInputSchema())
  async variantDelete(args: { input: VariantDeleteInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(VariantDeleteScript, {
      id: input.id,
      permanent: Boolean(input.permanent),
    });

    return {
      deletedVariantId: result.deletedVariantId ?? null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Set variant SKU.
   */
  @ZodResolver(VariantSetSkuInputSchema())
  async variantSetSku(args: { input: VariantSetSkuInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(VariantSetSkuScript, {
      variantId: input.variantId,
      sku: input.sku,
    });

    return {
      variant: result.variant
        ? new VariantResolver(result.variant.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Set variant dimensions.
   */
  @ZodResolver(VariantSetDimensionsInputSchema())
  async variantSetDimensions(args: { input: VariantSetDimensionsInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(VariantSetDimensionsScript, {
      variantId: input.variantId,
      dimensions: {
        width: input.dimensions.width,
        length: input.dimensions.length,
        height: input.dimensions.height,
      },
    });

    return {
      variant: result.variant
        ? new VariantResolver(result.variant.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Set variant weight.
   */
  @ZodResolver(VariantSetWeightInputSchema())
  async variantSetWeight(args: { input: VariantSetWeightInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(VariantSetWeightScript, {
      variantId: input.variantId,
      weight: {
        value: input.weight.value,
      },
    });

    return {
      variant: result.variant
        ? new VariantResolver(result.variant.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Set variant pricing.
   */
  @ZodResolver(VariantSetPricingInputSchema())
  async variantSetPricing(args: { input: VariantSetPricingInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(VariantSetPricingScript, {
      variantId: input.variantId,
      currency: input.currency,
      amountMinor: Number(input.amountMinor),
      compareAtMinor: input.compareAtMinor
        ? Number(input.compareAtMinor)
        : undefined,
    });

    return {
      variant: result.price
        ? new VariantResolver(input.variantId, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Set variant cost.
   */
  @ZodResolver(VariantSetCostInputSchema())
  async variantSetCost(args: { input: VariantSetCostInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(VariantSetCostScript, {
      variantId: input.variantId,
      currency: input.currency,
      unitCostMinor: Number(input.unitCostMinor),
    });

    return {
      variant: result.cost
        ? new VariantResolver(input.variantId, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Set variant stock.
   */
  @ZodResolver(VariantSetStockInputSchema())
  async variantSetStock(args: { input: VariantSetStockInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(VariantSetStockScript, {
      variantId: input.variantId,
      warehouseId: input.warehouseId,
      quantity: input.quantity,
    });

    return {
      stock: result.stock
        ? new StockResolver(result.stock.id, this.$ctx)
        : null,
      variant: result.stock
        ? new VariantResolver(input.variantId, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Set variant media.
   */
  @ZodResolver(VariantSetMediaInputSchema())
  async variantSetMedia(args: { input: VariantSetMediaInput }) {
    const { input } = args;

    // Decode Global IDs to UUIDs
    const fileIds = input.fileIds.map((fileId) =>
      decodeGlobalIdByType(fileId, GlobalIdEntity.File)
    );

    const result = await this.$ctx.kernel.runScript(VariantSetMediaScript, {
      variantId: input.variantId,
      fileIds,
    });

    return {
      variant: result.variant
        ? new VariantResolver(result.variant.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  // ---- Warehouse Mutations ----

  /**
   * Create a new warehouse.
   */
  @ZodResolver(WarehouseCreateInputSchema())
  async warehouseCreate(args: { input: WarehouseCreateInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(WarehouseCreateScript, {
      code: input.code,
      name: input.name,
      isDefault: input.isDefault ?? undefined,
    });

    return {
      warehouse: result.warehouse
        ? new WarehouseResolver(result.warehouse.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Update an existing warehouse.
   */
  @ZodResolver(WarehouseUpdateInputSchema())
  async warehouseUpdate(args: { input: WarehouseUpdateInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(WarehouseUpdateScript, {
      id: input.id,
      code: input.code ?? undefined,
      name: input.name ?? undefined,
      isDefault: input.isDefault ?? undefined,
    });

    return {
      warehouse: result.warehouse
        ? new WarehouseResolver(result.warehouse.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Delete a warehouse.
   */
  @ZodResolver(WarehouseDeleteInputSchema())
  async warehouseDelete(args: { input: WarehouseDeleteInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(WarehouseDeleteScript, {
      id: input.id,
    });

    return {
      deletedWarehouseId: result.deletedWarehouseId ?? null,
      userErrors: result.userErrors,
    };
  }

  // ---- Option Mutations ----

  /**
   * Create a new product option.
   */
  @ZodResolver(ProductOptionCreateInputSchema())
  async productOptionCreate(args: { input: ProductOptionCreateInput }) {
    const { input } = args;

    if (!input.productId) {
      return {
        option: null,
        userErrors: [
          {
            message: "Product ID is required",
            field: ["productId"],
            code: "REQUIRED",
          },
        ],
      };
    }

    const result = await this.$ctx.kernel.runScript(OptionCreateScript, {
      productId: input.productId,
      slug: input.slug,
      name: input.name,
      displayType: input.displayType,
      values: input.values.map((v) => ({
        slug: v.slug,
        name: v.name,
        swatch: v.swatch
          ? {
              swatchType: v.swatch.swatchType,
              colorOne: v.swatch.colorOne ?? undefined,
              colorTwo: v.swatch.colorTwo ?? undefined,
              fileId: v.swatch.fileId ?? undefined,
              metadata: v.swatch.metadata,
            }
          : undefined,
      })),
    });

    return {
      option: result.option
        ? new OptionResolver(result.option.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Update an existing product option.
   */
  @ZodResolver(ProductOptionUpdateInputSchema())
  async productOptionUpdate(args: { input: ProductOptionUpdateInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(OptionUpdateScript, {
      id: input.id,
      slug: input.slug ?? undefined,
      name: input.name ?? undefined,
      displayType: input.displayType ?? undefined,
      values: input.values
        ? {
            create: input.values.create?.map((v) => ({
              slug: v.slug,
              name: v.name,
              swatch: v.swatch
                ? {
                    swatchType: v.swatch.swatchType,
                    colorOne: v.swatch.colorOne ?? undefined,
                    colorTwo: v.swatch.colorTwo ?? undefined,
                    fileId: v.swatch.fileId ?? undefined,
                    metadata: v.swatch.metadata,
                  }
                : undefined,
            })),
            update: input.values.update?.map((v) => ({
              id: v.id,
              slug: v.slug ?? undefined,
              name: v.name ?? undefined,
              swatch:
                v.swatch === null
                  ? null
                  : v.swatch
                  ? {
                      swatchType: v.swatch.swatchType,
                      colorOne: v.swatch.colorOne ?? undefined,
                      colorTwo: v.swatch.colorTwo ?? undefined,
                      fileId: v.swatch.fileId ?? undefined,
                      metadata: v.swatch.metadata,
                    }
                  : undefined,
            })),
            delete: input.values.delete ?? undefined,
          }
        : undefined,
    });

    return {
      option: result.option
        ? new OptionResolver(result.option.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Delete a product option.
   */
  @ZodResolver(ProductOptionDeleteInputSchema())
  async productOptionDelete(args: { input: ProductOptionDeleteInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(OptionDeleteScript, {
      id: input.id,
    });

    return {
      deletedOptionId: result.deletedOptionId ?? null,
      userErrors: result.userErrors,
    };
  }

  // ---- Feature Mutations ----

  /**
   * Create a new product feature.
   */
  @ZodResolver(ProductFeatureCreateInputSchema())
  async productFeatureCreate(args: { input: ProductFeatureCreateInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(FeatureCreateScript, {
      productId: input.productId,
      slug: input.slug,
      name: input.name,
      values: input.values.map((v) => ({
        slug: v.slug,
        name: v.name,
      })),
    });

    return {
      feature: result.feature
        ? new FeatureResolver(result.feature.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Update an existing product feature.
   */
  @ZodResolver(ProductFeatureUpdateInputSchema())
  async productFeatureUpdate(args: { input: ProductFeatureUpdateInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(FeatureUpdateScript, {
      id: input.id,
      slug: input.slug ?? undefined,
      name: input.name ?? undefined,
      values: input.values
        ? {
            create: input.values.create?.map((v) => ({
              slug: v.slug,
              name: v.name,
            })),
            update: input.values.update?.map((v) => ({
              id: v.id,
              slug: v.slug ?? undefined,
              name: v.name ?? undefined,
            })),
            delete: input.values.delete ?? undefined,
          }
        : undefined,
    });

    return {
      feature: result.feature
        ? new FeatureResolver(result.feature.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Delete a product feature.
   */
  @ZodResolver(ProductFeatureDeleteInputSchema())
  async productFeatureDelete(args: { input: ProductFeatureDeleteInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(FeatureDeleteScript, {
      id: input.id,
    });

    return {
      deletedFeatureId: result.deletedFeatureId ?? null,
      userErrors: result.userErrors,
    };
  }
}
