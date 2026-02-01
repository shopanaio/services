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
import { ProductBulkUpdateJobResolver } from "./ProductBulkUpdateJobResolver.js";
import {
  ProductDeleteScript,
  ProductUpdateStatusScript,
} from "../../scripts/product/index.js";
import type {
  ProductUpdateWorkflowInput,
  ProductUpdateWorkflowResult,
  ProductUpdateOperation,
  WorkflowContext,
} from "../../workflows/dto/ProductUpdateWorkflowDto.js";
import type { ProductCreateParams, ProductCreateResult } from "../../sagas/index.js";
import {
  VariantCreateScript,
  VariantDeleteScript,
  VariantUpdateMediaScript,
  VariantUpdatePricingScript,
  VariantUpdateDimensionsScript,
  VariantUpdateInventoryScript,
  VariantUpdateOptionsScript,
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
  OptionsSyncScript,
} from "../../scripts/option/index.js";
import {
  FeatureCreateScript,
  FeatureUpdateScript,
  FeatureDeleteScript,
  FeaturesSyncScript,
} from "../../scripts/feature/index.js";
import type { ProductBulkUpdateItem } from "../../workflows/dto/BulkEditWorkflowDto.js";
import type {
  ProductCreateInput,
  ProductBulkUpdateInput,
  ProductDeleteInput,
  ProductUpdateStatusInput,
  VariantCreateInput,
  VariantDeleteInput,
  VariantUpdatePricingInput,
  VariantUpdateMediaInput,
  VariantUpdateDimensionsInput,
  VariantUpdateInventoryInput,
  VariantUpdateOptionsInput,
  WarehouseCreateInput,
  WarehouseUpdateInput,
  WarehouseDeleteInput,
  ProductOptionCreateInput,
  ProductOptionUpdateInput,
  ProductOptionDeleteInput,
  ProductOptionsSyncInput,
  ProductFeatureCreateInput,
  ProductFeatureUpdateInput,
  ProductFeatureDeleteInput,
  ProductFeaturesSyncInput,
  InventoryMutationProductUpdateArgs,
} from "./generated/types.js";
import {
  ProductCreateInputSchema,
  ProductDeleteInputSchema,
  ProductUpdateStatusInputSchema,
  VariantCreateInputSchema,
  VariantDeleteInputSchema,
  VariantUpdatePricingInputSchema,
  VariantUpdateMediaInputSchema,
  VariantUpdateDimensionsInputSchema,
  VariantUpdateInventoryInputSchema,
  VariantUpdateOptionsInputSchema,
  WarehouseCreateInputSchema,
  WarehouseUpdateInputSchema,
  WarehouseDeleteInputSchema,
  ProductOptionCreateInputSchema,
  ProductOptionUpdateInputSchema,
  ProductOptionDeleteInputSchema,
  ProductOptionsSyncInputSchema,
  ProductFeatureCreateInputSchema,
  ProductFeatureUpdateInputSchema,
  ProductFeatureDeleteInputSchema,
  ProductFeaturesSyncInputSchema,
} from "./generated/schemas.js";
import { ProductBulkUpdateInputSchema } from "./validation/productBulkEditSchema.js";

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
   * Uses ProductCreateSaga to ensure back-refs are synced only after DB commit.
   */
  @ZodResolver(ProductCreateInputSchema())
  async productCreate(args: { input: ProductCreateInput }) {
    const { input } = args;

    // Decode Global IDs to UUIDs for media files
    const mediaFileIds = input.mediaFileIds?.map((fileId) =>
      decodeGlobalIdByType(fileId, GlobalIdEntity.File)
    );

    const sagaInput: ProductCreateParams = {
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
      organizationId: this.$ctx.store.organizationId,
      storeId: this.$ctx.store.id,
      userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
    };

    const sagaResult = await this.$ctx.kernel.getServices().broker.runSaga<
      ProductCreateResult,
      ProductCreateParams
    >(
      "inventory.productCreate",
      sagaInput,
      {
        source: "workflow",
        workflowId: `productCreate:${Date.now()}`,
        stepId: "create",
      }
    );

    const result = sagaResult.data!;

    return {
      product: result.product
        ? new ProductResolver(result.product.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Delete a operations.
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
   * Update product status (publish or unpublish).
   */
  @ZodResolver(ProductUpdateStatusInputSchema())
  async productUpdateStatus(args: { input: ProductUpdateStatusInput }) {
    const { input } = args;

    const status = input.action === "PUBLISH" ? "published" : "draft";
    const result = await this.$ctx.kernel.runScript(ProductUpdateStatusScript, {
      id: input.productId,
      status,
    });

    return {
      product: result.result
        ? new ProductResolver(result.result.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Unified product update with optimistic locking.
   * Supports product and variant updates in a single request.
   */
  async productUpdate(args: InventoryMutationProductUpdateArgs) {
    const { productId, expectedRevision, operations } = args;
    const variants = operations?.variants;

    // Map GraphQL input to workflow operations
    const workflowOps: ProductUpdateOperation[] = [];

    if (operations) {
      workflowOps.push({
        type: "productUpdate",
        params: {
          id: productId,
          handle: operations.handle ?? undefined,
          title: operations.title ?? undefined,
          content: operations.content
            ? {
                description: operations.content.description
                  ? {
                      text: operations.content.description.text,
                      html: operations.content.description.html,
                      json: operations.content.description.json as Record<string, unknown>,
                    }
                  : undefined,
                excerpt: operations.content.excerpt ?? undefined,
              }
            : undefined,
          seo: operations.seo
            ? {
                title: operations.seo.seoTitle ?? undefined,
                description: operations.seo.seoDescription ?? undefined,
              }
            : undefined,
          status: operations.status
            ? operations.status === "PUBLISHED"
              ? "published"
              : "draft"
            : undefined,
          media: operations.media
            ? {
                fileIds: operations.media.fileIds.map((id) =>
                  decodeGlobalIdByType(id, GlobalIdEntity.File)
                ),
              }
            : undefined,
        },
      });
    }

    if (variants) {
      for (const vu of variants) {
        workflowOps.push({
          type: "variantUpdate",
          params: {
            variantId: vu.variantId,
            pricing: vu.pricing
              ? {
                  currency: vu.pricing.currency,
                  amountMinor: Number(vu.pricing.amountMinor),
                  compareAtMinor: vu.pricing.compareAtMinor
                    ? Number(vu.pricing.compareAtMinor)
                    : undefined,
                }
              : undefined,
            inventory: vu.inventory
              ? {
                  warehouseId: vu.inventory.warehouseId,
                  onHand: vu.inventory.onHand,
                  unavailable: vu.inventory.unavailable ?? undefined,
                  sku: vu.inventory.sku ?? undefined,
                  weight: vu.inventory.weight ?? undefined,
                  unitCostMinor: vu.inventory.unitCostMinor
                    ? Number(vu.inventory.unitCostMinor)
                    : undefined,
                  costCurrency: vu.inventory.costCurrency ?? undefined,
                }
              : undefined,
            dimensions: vu.dimensions
              ? {
                  width: vu.dimensions.width,
                  height: vu.dimensions.height,
                  length: vu.dimensions.length,
                }
              : undefined,
            media: vu.media
              ? {
                  fileIds: vu.media.fileIds.map((id) =>
                    decodeGlobalIdByType(id, GlobalIdEntity.File)
                  ),
                }
              : undefined,
            options: vu.options ? { set: vu.options.set } : undefined,
          },
        });
      }
    }

    const workflowInput: ProductUpdateWorkflowInput = {
      productId,
      expectedRevision: expectedRevision ?? undefined,
      operations: workflowOps,
      context: {
        organizationId: this.$ctx.store.organizationId,
        projectId: this.$ctx.store.id,
        storeId: this.$ctx.store.id,
        userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
        locale: this.$ctx.locale ?? "uk",
      },
    };

    const idempotencyKey = this.$ctx.requestId;

    const result = (await this.$ctx.kernel
      .getServices()
      .broker.runWorkflow(
        "inventory.productUpdate",
        workflowInput,
        {
          source: "workflow",
          workflowId: `productUpdate:${productId}:${idempotencyKey}`,
          stepId: "start",
        }
      )) as ProductUpdateWorkflowResult;

    return {
      product: result.product
        ? new ProductResolver(result.product.id, this.$ctx)
        : null,
      operationResults: result.operationResults.map((r) => ({
        type: r.type === "productUpdate" ? "PRODUCT_UPDATE" : "VARIANT_UPDATE",
        applied: r.applied,
        errors: r.errors,
      })),
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
   * Set variant pricing.
   */
  @ZodResolver(VariantUpdatePricingInputSchema())
  async variantUpdatePricing(args: { input: VariantUpdatePricingInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(VariantUpdatePricingScript, {
      variantId: input.variantId,
      currency: input.currency,
      amountMinor: Number(input.amountMinor),
      compareAtMinor: input.compareAtMinor
        ? Number(input.compareAtMinor)
        : undefined,
    });

    return {
      variant: result.result
        ? new VariantResolver(input.variantId, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Set variant dimensions.
   */
  @ZodResolver(VariantUpdateDimensionsInputSchema())
  async variantUpdateDimensions(args: { input: VariantUpdateDimensionsInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(VariantUpdateDimensionsScript, {
      variantId: input.variantId,
      width: input.width,
      height: input.height,
      length: input.length,
    });

    return {
      variant: result.result
        ? new VariantResolver(result.result.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Set variant inventory (stock, SKU, weight, and unit cost).
   */
  @ZodResolver(VariantUpdateInventoryInputSchema())
  async variantUpdateInventory(args: { input: VariantUpdateInventoryInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(VariantUpdateInventoryScript, {
      variantId: input.variantId,
      warehouseId: input.warehouseId,
      onHand: input.onHand,
      unavailable: input.unavailable ?? undefined,
      sku: input.sku ?? undefined,
      weight: input.weight ?? undefined,
      unitCostMinor: input.unitCostMinor ? Number(input.unitCostMinor) : undefined,
      costCurrency: input.costCurrency ?? undefined,
    });

    return {
      stock: result.result
        ? new StockResolver(result.result.id, this.$ctx)
        : null,
      variant: result.result
        ? new VariantResolver(input.variantId, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Set variant options (option value links).
   */
  @ZodResolver(VariantUpdateOptionsInputSchema())
  async variantUpdateOptions(args: { input: VariantUpdateOptionsInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(VariantUpdateOptionsScript, {
      variantId: input.variantId,
      links: input.links.map((link) => ({
        optionId: link.optionId,
        optionValueId: link.optionValueId,
      })),
    });

    return {
      variant: result.result
        ? new VariantResolver(result.result.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Set variant media.
   */
  @ZodResolver(VariantUpdateMediaInputSchema())
  async variantUpdateMedia(args: { input: VariantUpdateMediaInput }) {
    const { input } = args;

    // Decode Global IDs to UUIDs
    const fileIds = input.fileIds.map((fileId) =>
      decodeGlobalIdByType(fileId, GlobalIdEntity.File)
    );

    const result = await this.$ctx.kernel.runScript(VariantUpdateMediaScript, {
      variantId: input.variantId,
      fileIds,
    });

    return {
      variant: result.result
        ? new VariantResolver(result.result.id, this.$ctx)
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

  /**
   * Sync all product options in a single transaction.
   * Options not in the input list will be deleted.
   */
  @ZodResolver(ProductOptionsSyncInputSchema())
  async productOptionsSync(args: { input: ProductOptionsSyncInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(OptionsSyncScript, {
      productId: input.productId,
      options: input.options.map((option) => ({
        id: option.id ?? undefined,
        index: option.index,
        slug: option.slug,
        name: option.name,
        displayType: option.displayType,
        values: option.values.map((value) => ({
          id: value.id ?? undefined,
          index: value.index,
          slug: value.slug,
          name: value.name,
          swatch: value.swatch
            ? {
                swatchType: value.swatch.swatchType,
                colorOne: value.swatch.colorOne ?? undefined,
                colorTwo: value.swatch.colorTwo ?? undefined,
                fileId: value.swatch.fileId ?? undefined,
                metadata: value.swatch.metadata,
              }
            : value.swatch,
        })),
      })),
    });

    return {
      product: result.product
        ? new ProductResolver(result.product.id, this.$ctx)
        : null,
      options: result.options.map(
        (option) => new OptionResolver(option.id, this.$ctx)
      ),
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
      name: input.name,
      values: input.values.map((v) => ({
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
      name: input.name ?? undefined,
      values: input.values
        ? {
            create: input.values.create?.map((v) => ({
              name: v.name,
            })),
            update: input.values.update?.map((v) => ({
              id: v.id,
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

  /**
   * Sync all product features for a operations.
   */
  @ZodResolver(ProductFeaturesSyncInputSchema())
  async productFeaturesSync(args: { input: ProductFeaturesSyncInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(FeaturesSyncScript, {
      productId: input.productId,
      features: input.features.map((feature) => ({
        id: feature.id ?? undefined,
        index: feature.index,
        isGroup: feature.isGroup,
        name: feature.name,
        values: feature.values?.map((value) => ({
          id: value.id ?? undefined,
          index: value.index,
          name: value.name,
        })),
      })),
    });

    return {
      product: result.product
        ? new ProductResolver(result.product.id, this.$ctx)
        : null,
      features: result.features.map(
        (feature) => new FeatureResolver(feature.id, this.$ctx)
      ),
      userErrors: result.userErrors,
    };
  }

  // ---- Bulk Update Mutations ----

  @ZodResolver(ProductBulkUpdateInputSchema())
  async productBulkUpdate(args: { input: ProductBulkUpdateInput }) {
    const { input } = args;

    // Build context
    const context: WorkflowContext = {
      organizationId: this.$ctx.store.organizationId,
      projectId: this.$ctx.store.id,
      storeId: this.$ctx.store.id,
      userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
      locale: this.$ctx.locale ?? "uk",
    };

    // Map products with transformed operations
    const products: ProductBulkUpdateItem[] = input.products.map((item) => ({
      productId: item.productId,
      expectedRevision: item.expectedRevision ?? undefined,
      operations: mapOperationsForBulk(item.productId, item.operations),
    }));

    const idempotencyKey = this.$ctx.requestId;

    const result = (await this.$ctx.kernel
      .getServices()
      .broker.runWorkflow(
        "inventory.productBulkEdit",
        { products, context },
        {
          source: "workflow",
          workflowId: `productBulkEdit:${idempotencyKey}`,
          stepId: "start",
        }
      )) as { jobId: string };

    return {
      job: result.jobId
        ? new ProductBulkUpdateJobResolver(result.jobId, this.$ctx)
        : null,
      userErrors: [],
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function mapOperationsForBulk(
  productId: string,
  operations: ProductBulkUpdateInput["products"][0]["operations"]
): ProductUpdateOperation[] {
  const result: ProductUpdateOperation[] = [];
  const variants = operations?.variants;

  if (operations) {
    result.push({
      type: "productUpdate",
      params: {
        id: productId,
        handle: operations.handle ?? undefined,
        title: operations.title ?? undefined,
        content: operations.content
          ? {
              description: operations.content.description
                ? {
                    text: operations.content.description.text,
                    html: operations.content.description.html,
                    json: operations.content.description.json as Record<string, unknown>,
                  }
                : undefined,
              excerpt: operations.content.excerpt ?? undefined,
            }
          : undefined,
        seo: operations.seo
          ? {
              title: operations.seo.seoTitle ?? undefined,
              description: operations.seo.seoDescription ?? undefined,
            }
          : undefined,
        status: operations.status
          ? operations.status === "PUBLISHED"
            ? "published"
            : "draft"
          : undefined,
        media: operations.media
          ? {
              fileIds: operations.media.fileIds.map((id) =>
                decodeGlobalIdByType(id, GlobalIdEntity.File)
              ),
            }
          : undefined,
      },
    });
  }

  if (variants) {
    for (const vu of variants) {
      result.push({
        type: "variantUpdate",
        params: {
          variantId: vu.variantId,
          pricing: vu.pricing
            ? {
                currency: vu.pricing.currency,
                amountMinor: Number(vu.pricing.amountMinor),
                compareAtMinor: vu.pricing.compareAtMinor
                  ? Number(vu.pricing.compareAtMinor)
                  : undefined,
              }
            : undefined,
          inventory: vu.inventory
            ? {
                warehouseId: vu.inventory.warehouseId,
                onHand: vu.inventory.onHand,
                unavailable: vu.inventory.unavailable ?? undefined,
                sku: vu.inventory.sku ?? undefined,
                weight: vu.inventory.weight ?? undefined,
                unitCostMinor: vu.inventory.unitCostMinor
                  ? Number(vu.inventory.unitCostMinor)
                  : undefined,
                costCurrency: vu.inventory.costCurrency ?? undefined,
              }
            : undefined,
          dimensions: vu.dimensions
            ? {
                width: vu.dimensions.width,
                height: vu.dimensions.height,
                length: vu.dimensions.length,
              }
            : undefined,
          media: vu.media
            ? {
                fileIds: vu.media.fileIds.map((id) =>
                  decodeGlobalIdByType(id, GlobalIdEntity.File)
                ),
              }
            : undefined,
          options: vu.options ? { set: vu.options.set } : undefined,
        },
      });
    }
  }

  return result;
}
