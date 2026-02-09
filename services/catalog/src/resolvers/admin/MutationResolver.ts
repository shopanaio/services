import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { ApolloMutation, ZodResolver } from "@shopana/type-resolver";
import { CatalogType } from "./CatalogType.js";
import { ProductResolver } from "./ProductResolver.js";
import { VariantResolver } from "./VariantResolver.js";
import { OptionResolver } from "./OptionResolver.js";
import { FeatureResolver } from "./FeatureResolver.js";
import { CategoryResolver } from "./CategoryResolver.js";
import { TagResolver } from "./TagResolver.js";
import { CollectionResolver } from "./CollectionResolver.js";
import { FacetGroupResolver } from "./FacetGroupResolver.js";
import { FacetResolver } from "./FacetResolver.js";
import { FacetValueResolver } from "./FacetValueResolver.js";
import { FacetSwatchResolver } from "./FacetSwatchResolver.js";
import { ProductBulkUpdateJobResolver } from "./ProductBulkUpdateJobResolver.js";
import {
  ProductDeleteScript,
  ProductUpdateStatusScript,
} from "../../scripts/product/index.js";
import {
  CategoryCreateScript,
  CategoryUpdateScript,
  CategoryDeleteScript,
  CategoryMoveScript,
  CategoryMoveProductScript,
  CategoryRebalanceScript,
  CategoryUpdateSortScript,
} from "../../scripts/category/index.js";
import {
  TagCreateScript,
  TagUpdateScript,
  TagDeleteScript,
} from "../../scripts/tag/index.js";
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
  VariantUpdateOptionsScript,
} from "../../scripts/variant/index.js";
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
import {
  FacetGroupCreateScript,
  FacetGroupUpdateScript,
  FacetGroupDeleteScript,
  FacetCreateScript,
  FacetUpdateScript,
  FacetDeleteScript,
  FacetValueCreateScript,
  FacetValueUpdateScript,
  FacetValueDeleteScript,
  FacetSwatchCreateScript,
  FacetSwatchUpdateScript,
  FacetSwatchDeleteScript,
} from "../../scripts/facet/index.js";
import {
  CollectionCreateScript,
  CollectionUpdateScript,
  CollectionDeleteScript,
  CollectionAddProductsScript,
  CollectionRemoveProductsScript,
  CollectionMoveProductScript,
  CollectionUpdateRulesScript,
} from "../../scripts/collection/index.js";
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
  VariantUpdateOptionsInput,
  ProductOptionCreateInput,
  ProductOptionUpdateInput,
  ProductOptionDeleteInput,
  ProductOptionsSyncInput,
  ProductFeatureCreateInput,
  ProductFeatureUpdateInput,
  ProductFeatureDeleteInput,
  ProductFeaturesSyncInput,
  CatalogMutationProductUpdateArgs,
} from "./generated/types.js";
import {
  ProductCreateInputSchema,
  ProductDeleteInputSchema,
  ProductUpdateStatusInputSchema,
  VariantCreateInputSchema,
  VariantDeleteInputSchema,
  VariantUpdatePricingInputSchema,
  VariantUpdateMediaInputSchema,
  VariantUpdateOptionsInputSchema,
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
 * Root Mutation resolver for Catalog Service.
 * Decorated with @ApolloMutation to create Apollo-compatible resolver proxy.
 */
@ApolloMutation
export class MutationResolver extends CatalogType<Record<string, never>> {
  /**
   * Entry point for catalog-related mutations.
   * Returns namespace resolver that handles all catalog mutations.
   */
  catalogMutation() {
    return new CatalogMutationResolver({}, this.$ctx);
  }
}

/**
 * CatalogMutation namespace resolver.
 * Handles all catalog-related mutations (products, variants, options, features).
 * Does NOT contain inventory mutations (warehouse, stock, dimensions, cost).
 */
export class CatalogMutationResolver extends CatalogType<Record<string, never>> {
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
      inventoryItem: input.inventoryItem
        ? {
            tracked: input.inventoryItem.tracked,
            sku: input.inventoryItem.sku ?? undefined,
            continueSellingWhenOutOfStock: input.inventoryItem.continueSellingWhenOutOfStock ?? undefined,
          }
        : undefined,
      organizationId: this.$ctx.store.organizationId,
      storeId: this.$ctx.store.id,
      userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
    };

    const sagaResult = await this.$ctx.kernel.getServices().broker.runSaga<
      ProductCreateResult,
      ProductCreateParams
    >(
      "catalog.productCreate",
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
   * Does NOT support inventory operations (they live in Inventory Service).
   */
  async productUpdate(args: CatalogMutationProductUpdateArgs) {
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
        "catalog.productUpdate",
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

  // ═══════════════════════════════════════════════════════════
  // Warehouse Mutations REMOVED (moved to Inventory Service)
  // - warehouseCreate
  // - warehouseUpdate
  // - warehouseDelete
  // ═══════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════
  // Variant Inventory Mutations REMOVED (moved to Inventory Service)
  // - variantUpdateDimensions
  // - variantUpdateInventory
  // ═══════════════════════════════════════════════════════════

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
      slug: input.slug,
      name: input.name,
      values: input.values.map((v) => ({
        name: v.name,
        slug: v.slug,
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
              name: v.name,
              slug: v.slug,
            })),
            update: input.values.update?.map((v) => ({
              id: v.id,
              name: v.name ?? undefined,
              slug: v.slug ?? undefined,
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
   * Sync all product features for a product.
   */
  @ZodResolver(ProductFeaturesSyncInputSchema())
  async productFeaturesSync(args: { input: ProductFeaturesSyncInput }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(FeaturesSyncScript, {
      productId: input.productId,
      features: input.features.map((feature) => ({
        id: feature.id ?? undefined,
        index: feature.index,
        slug: feature.slug,
        isGroup: feature.isGroup,
        name: feature.name,
        values: feature.values?.map((value) => ({
          id: value.id ?? undefined,
          index: value.index,
          slug: value.slug,
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

  // ---- Category Mutations ----

  /**
   * Create a new category.
   */
  async categoryCreate(args: {
    input: {
      handle: string;
      name: string;
      parentId?: string | null;
      description?: {
        text?: string | null;
        html?: string | null;
        json?: unknown | null;
      } | null;
      seo?: {
        seoTitle?: string | null;
        seoDescription?: string | null;
        ogTitle?: string | null;
        ogDescription?: string | null;
        ogImageId?: string | null;
      } | null;
      mediaFileIds?: string[] | null;
      publish?: boolean | null;
    };
  }) {
    const { input } = args;

    // Decode Global IDs
    const parentId = input.parentId
      ? decodeGlobalIdByType(input.parentId, GlobalIdEntity.Category)
      : undefined;
    const mediaFileIds = input.mediaFileIds?.map((id) =>
      decodeGlobalIdByType(id, GlobalIdEntity.File)
    );

    const result = await this.$ctx.kernel.runScript(CategoryCreateScript, {
      handle: input.handle,
      name: input.name,
      parentId,
      description: input.description
        ? {
            text: input.description.text ?? undefined,
            html: input.description.html ?? undefined,
            json: input.description.json as Record<string, unknown> | undefined,
          }
        : undefined,
      seo: input.seo
        ? {
            seoTitle: input.seo.seoTitle ?? undefined,
            seoDescription: input.seo.seoDescription ?? undefined,
            ogTitle: input.seo.ogTitle ?? undefined,
            ogDescription: input.seo.ogDescription ?? undefined,
            ogImageId: input.seo.ogImageId
              ? decodeGlobalIdByType(input.seo.ogImageId, GlobalIdEntity.File)
              : undefined,
          }
        : undefined,
      mediaFileIds,
      publish: input.publish ?? undefined,
    });

    return {
      category: result.category
        ? new CategoryResolver(result.category.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Update an existing category.
   */
  async categoryUpdate(args: {
    input: {
      id: string;
      handle?: string | null;
      defaultSort?: "MANUAL" | "PRICE" | "NEWEST" | "NAME" | null;
      defaultSortDirection?: "asc" | "desc" | null;
      name?: string | null;
      description?: {
        text?: string | null;
        html?: string | null;
        json?: unknown | null;
      } | null;
      seo?: {
        seoTitle?: string | null;
        seoDescription?: string | null;
        ogTitle?: string | null;
        ogDescription?: string | null;
        ogImageId?: string | null;
      } | null;
      mediaFileIds?: string[] | null;
    };
  }) {
    const { input } = args;

    const id = decodeGlobalIdByType(input.id, GlobalIdEntity.Category);
    const mediaFileIds = input.mediaFileIds?.map((id) =>
      decodeGlobalIdByType(id, GlobalIdEntity.File)
    );

    const result = await this.$ctx.kernel.runScript(CategoryUpdateScript, {
      id,
      handle: input.handle ?? undefined,
      defaultSort: input.defaultSort?.toLowerCase() as
        | "manual"
        | "price"
        | "newest"
        | "name"
        | undefined,
      defaultSortDirection: (input.defaultSortDirection ?? undefined) as
        | "asc"
        | "desc"
        | undefined,
      name: input.name ?? undefined,
      description: input.description === null
        ? null
        : input.description
        ? {
            text: input.description.text ?? undefined,
            html: input.description.html ?? undefined,
            json: input.description.json as Record<string, unknown> | undefined,
          }
        : undefined,
      seo:
        input.seo === null
          ? null
          : input.seo
          ? {
              seoTitle: input.seo.seoTitle ?? undefined,
              seoDescription: input.seo.seoDescription ?? undefined,
              ogTitle: input.seo.ogTitle ?? undefined,
              ogDescription: input.seo.ogDescription ?? undefined,
              ogImageId: input.seo.ogImageId
                ? decodeGlobalIdByType(input.seo.ogImageId, GlobalIdEntity.File)
                : undefined,
            }
          : undefined,
      mediaFileIds,
    });

    return {
      category: result.category
        ? new CategoryResolver(result.category.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Move a category to a new parent.
   */
  async categoryMove(args: {
    input: {
      id: string;
      newParentId?: string | null;
    };
  }) {
    const { input } = args;

    const id = decodeGlobalIdByType(input.id, GlobalIdEntity.Category);
    const newParentId = input.newParentId
      ? decodeGlobalIdByType(input.newParentId, GlobalIdEntity.Category)
      : null;

    const result = await this.$ctx.kernel.runScript(CategoryMoveScript, {
      id,
      newParentId,
    });

    return {
      category: result.category
        ? new CategoryResolver(result.category.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async categoryMoveProduct(args: {
    input: {
      categoryId: string;
      productId: string;
      afterProductId?: string | null;
      beforeProductId?: string | null;
    };
  }) {
    const { input } = args;
    const categoryId = decodeGlobalIdByType(input.categoryId, GlobalIdEntity.Category);
    const productId = decodeGlobalIdByType(input.productId, GlobalIdEntity.Product);
    const afterProductId = input.afterProductId
      ? decodeGlobalIdByType(input.afterProductId, GlobalIdEntity.Product)
      : undefined;
    const beforeProductId = input.beforeProductId
      ? decodeGlobalIdByType(input.beforeProductId, GlobalIdEntity.Product)
      : undefined;

    const result = await this.$ctx.kernel.runScript(CategoryMoveProductScript, {
      categoryId,
      productId,
      afterProductId,
      beforeProductId,
    });

    return {
      category: result.category
        ? new CategoryResolver(result.category.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async categoryRebalance(args: { input: { categoryId: string } }) {
    const categoryId = decodeGlobalIdByType(
      args.input.categoryId,
      GlobalIdEntity.Category
    );
    const result = await this.$ctx.kernel.runScript(CategoryRebalanceScript, {
      categoryId,
    });

    return {
      category: result.category
        ? new CategoryResolver(result.category.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async categoryUpdateSort(args: {
    input: {
      id: string;
      defaultSort: "MANUAL" | "PRICE" | "NEWEST" | "NAME";
      defaultSortDirection: "asc" | "desc";
    };
  }) {
    const id = decodeGlobalIdByType(args.input.id, GlobalIdEntity.Category);
    const result = await this.$ctx.kernel.runScript(CategoryUpdateSortScript, {
      id,
      defaultSort: args.input.defaultSort.toLowerCase() as
        | "manual"
        | "price"
        | "newest"
        | "name",
      defaultSortDirection: args.input.defaultSortDirection,
    });

    return {
      category: result.category
        ? new CategoryResolver(result.category.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Delete a category.
   */
  async categoryDelete(args: {
    input: {
      id: string;
      permanent?: boolean | null;
    };
  }) {
    const { input } = args;

    const id = decodeGlobalIdByType(input.id, GlobalIdEntity.Category);

    const result = await this.$ctx.kernel.runScript(CategoryDeleteScript, {
      id,
      permanent: input.permanent ?? undefined,
    });

    return {
      deletedCategoryId: result.deletedCategoryId ?? null,
      userErrors: result.userErrors,
    };
  }

  async facetGroupCreate(args: {
    input: { name: string; collapsed?: boolean | null; sortIndex?: number | null };
  }) {
    const result = await this.$ctx.kernel.runScript(FacetGroupCreateScript, {
      name: args.input.name,
      collapsed: args.input.collapsed ?? undefined,
      sortIndex: args.input.sortIndex ?? undefined,
    });

    return {
      facetGroup: result.facetGroup
        ? new FacetGroupResolver(result.facetGroup.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async facetGroupUpdate(args: {
    input: {
      id: string;
      name?: string | null;
      collapsed?: boolean | null;
      sortIndex?: number | null;
    };
  }) {
    const result = await this.$ctx.kernel.runScript(FacetGroupUpdateScript, {
      id: args.input.id,
      name: args.input.name ?? undefined,
      collapsed: args.input.collapsed ?? undefined,
      sortIndex: args.input.sortIndex ?? undefined,
    });

    return {
      facetGroup: result.facetGroup
        ? new FacetGroupResolver(result.facetGroup.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async facetGroupDelete(args: { input: { id: string } }) {
    const result = await this.$ctx.kernel.runScript(FacetGroupDeleteScript, {
      id: args.input.id,
    });
    return {
      deletedFacetGroupId: result.deletedFacetGroupId ?? null,
      userErrors: result.userErrors,
    };
  }

  async facetCreate(args: {
    input: {
      facetType: "PRICE" | "TAG" | "FEATURE" | "OPTION" | "IN_STOCK";
      slug: string;
      label: string;
      uiType?: "CHECKBOX" | "RADIO" | "DROPDOWN" | "RANGE" | "BOOLEAN" | null;
      selectionMode?: "SINGLE" | "MULTI" | null;
      groupId?: string | null;
      sortIndex?: number | null;
    };
  }) {
    const result = await this.$ctx.kernel.runScript(FacetCreateScript, {
      facetType: args.input.facetType.toLowerCase(),
      slug: args.input.slug,
      label: args.input.label,
      uiType: args.input.uiType?.toLowerCase(),
      selectionMode: args.input.selectionMode?.toLowerCase(),
      groupId: args.input.groupId ?? undefined,
      sortIndex: args.input.sortIndex ?? undefined,
    });

    return {
      facet: result.facet ? new FacetResolver(result.facet.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  async facetUpdate(args: {
    input: {
      id: string;
      slug?: string | null;
      label?: string | null;
      uiType?: "CHECKBOX" | "RADIO" | "DROPDOWN" | "RANGE" | "BOOLEAN" | null;
      selectionMode?: "SINGLE" | "MULTI" | null;
      groupId?: string | null;
      sortIndex?: number | null;
      minValues?: number | null;
      maxValuesVisible?: number | null;
      valueSort?: "COUNT" | "ALPHA" | "CUSTOM" | null;
      indexable?: boolean | null;
    };
  }) {
    const result = await this.$ctx.kernel.runScript(FacetUpdateScript, {
      id: args.input.id,
      slug: args.input.slug ?? undefined,
      label: args.input.label ?? undefined,
      uiType: args.input.uiType?.toLowerCase(),
      selectionMode: args.input.selectionMode?.toLowerCase(),
      groupId: args.input.groupId,
      sortIndex: args.input.sortIndex ?? undefined,
      minValues: args.input.minValues ?? undefined,
      maxValuesVisible: args.input.maxValuesVisible ?? undefined,
      valueSort: args.input.valueSort?.toLowerCase(),
      indexable: args.input.indexable ?? undefined,
    });

    return {
      facet: result.facet ? new FacetResolver(result.facet.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  async facetDelete(args: { input: { id: string } }) {
    const result = await this.$ctx.kernel.runScript(FacetDeleteScript, {
      id: args.input.id,
    });

    return {
      deletedFacetId: result.deletedFacetId ?? null,
      userErrors: result.userErrors,
    };
  }

  async facetValueCreate(args: {
    input: {
      facetId: string;
      slug: string;
      label: string;
      sourceHandles?: string[] | null;
      swatchId?: string | null;
      sortIndex?: number | null;
      enabled?: boolean | null;
    };
  }) {
    const result = await this.$ctx.kernel.runScript(FacetValueCreateScript, {
      facetId: args.input.facetId,
      slug: args.input.slug,
      label: args.input.label,
      sourceHandles: args.input.sourceHandles ?? undefined,
      swatchId: args.input.swatchId ?? undefined,
      sortIndex: args.input.sortIndex ?? undefined,
      enabled: args.input.enabled ?? undefined,
    });

    return {
      facetValue: result.facetValue
        ? new FacetValueResolver(result.facetValue.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async facetValueUpdate(args: {
    input: {
      id: string;
      slug?: string | null;
      label?: string | null;
      sourceHandles?: string[] | null;
      swatchId?: string | null;
      sortIndex?: number | null;
      enabled?: boolean | null;
    };
  }) {
    const result = await this.$ctx.kernel.runScript(FacetValueUpdateScript, {
      id: args.input.id,
      slug: args.input.slug ?? undefined,
      label: args.input.label ?? undefined,
      sourceHandles: args.input.sourceHandles ?? undefined,
      swatchId: args.input.swatchId ?? undefined,
      sortIndex: args.input.sortIndex ?? undefined,
      enabled: args.input.enabled ?? undefined,
    });

    return {
      facetValue: result.facetValue
        ? new FacetValueResolver(result.facetValue.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async facetValueDelete(args: { input: { id: string } }) {
    const result = await this.$ctx.kernel.runScript(FacetValueDeleteScript, {
      id: args.input.id,
    });
    return {
      deletedFacetValueId: result.deletedFacetValueId ?? null,
      userErrors: result.userErrors,
    };
  }

  async facetSwatchCreate(args: {
    input: {
      swatchType: "COLOR" | "GRADIENT" | "IMAGE";
      colorOne?: string | null;
      colorTwo?: string | null;
      fileId?: string | null;
      metadata?: unknown;
    };
  }) {
    const result = await this.$ctx.kernel.runScript(FacetSwatchCreateScript, {
      swatchType: args.input.swatchType.toLowerCase(),
      colorOne: args.input.colorOne ?? undefined,
      colorTwo: args.input.colorTwo ?? undefined,
      fileId: args.input.fileId
        ? decodeGlobalIdByType(args.input.fileId, GlobalIdEntity.File)
        : undefined,
      metadata: args.input.metadata,
    });
    return {
      facetSwatch: result.facetSwatch
        ? new FacetSwatchResolver(result.facetSwatch.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async facetSwatchUpdate(args: {
    input: {
      id: string;
      swatchType?: "COLOR" | "GRADIENT" | "IMAGE" | null;
      colorOne?: string | null;
      colorTwo?: string | null;
      fileId?: string | null;
      metadata?: unknown;
    };
  }) {
    const result = await this.$ctx.kernel.runScript(FacetSwatchUpdateScript, {
      id: args.input.id,
      swatchType: args.input.swatchType?.toLowerCase(),
      colorOne: args.input.colorOne ?? undefined,
      colorTwo: args.input.colorTwo ?? undefined,
      fileId: args.input.fileId
        ? decodeGlobalIdByType(args.input.fileId, GlobalIdEntity.File)
        : undefined,
      metadata: args.input.metadata,
    });
    return {
      facetSwatch: result.facetSwatch
        ? new FacetSwatchResolver(result.facetSwatch.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async facetSwatchDelete(args: { input: { id: string } }) {
    const result = await this.$ctx.kernel.runScript(FacetSwatchDeleteScript, {
      id: args.input.id,
    });
    return {
      deletedFacetSwatchId: result.deletedFacetSwatchId ?? null,
      userErrors: result.userErrors,
    };
  }

  async collectionCreate(args: {
    input: {
      handle?: string | null;
      type: "MANUAL" | "RULE";
      name: string;
      description?: { text?: string | null; html?: string | null; json?: unknown | null } | null;
      media?: Array<{ fileId: string; sortIndex?: number | null }> | null;
      seo?: {
        seoTitle?: string | null;
        seoDescription?: string | null;
        ogTitle?: string | null;
        ogDescription?: string | null;
        ogImageId?: string | null;
      } | null;
      defaultSort?: "MANUAL" | "PRICE" | "NEWEST" | "NAME" | null;
      defaultSortDirection?: "asc" | "desc" | null;
      activeFrom?: string | null;
      activeTo?: string | null;
      publish?: boolean | null;
    };
  }) {
    const mediaFileIds = (args.input.media ?? [])
      .map((item) => decodeGlobalIdByType(item.fileId, GlobalIdEntity.File));

    const result = await this.$ctx.kernel.runScript(CollectionCreateScript, {
      handle: args.input.handle ?? undefined,
      type: args.input.type.toLowerCase() as "manual" | "rule",
      name: args.input.name,
      description: args.input.description
        ? {
            text: args.input.description.text ?? undefined,
            html: args.input.description.html ?? undefined,
            json: args.input.description.json as Record<string, unknown> | undefined,
          }
        : undefined,
      mediaFileIds,
      seo: args.input.seo
        ? {
            seoTitle: args.input.seo.seoTitle ?? undefined,
            seoDescription: args.input.seo.seoDescription ?? undefined,
            ogTitle: args.input.seo.ogTitle ?? undefined,
            ogDescription: args.input.seo.ogDescription ?? undefined,
            ogImageId: args.input.seo.ogImageId
              ? decodeGlobalIdByType(args.input.seo.ogImageId, GlobalIdEntity.File)
              : undefined,
          }
        : undefined,
      defaultSort: args.input.defaultSort?.toLowerCase() as
        | "manual"
        | "price"
        | "newest"
        | "name"
        | undefined,
      defaultSortDirection: (args.input.defaultSortDirection ?? undefined) as
        | "asc"
        | "desc"
        | undefined,
      activeFrom: args.input.activeFrom ?? undefined,
      activeTo: args.input.activeTo ?? undefined,
      publish: args.input.publish ?? undefined,
    });

    return {
      collection: result.collection
        ? new CollectionResolver(result.collection.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async collectionUpdate(args: {
    input: {
      id: string;
      handle?: string | null;
      name?: string | null;
      description?: { text?: string | null; html?: string | null; json?: unknown | null } | null;
      media?: Array<{ fileId: string; sortIndex?: number | null }> | null;
      seo?: {
        seoTitle?: string | null;
        seoDescription?: string | null;
        ogTitle?: string | null;
        ogDescription?: string | null;
        ogImageId?: string | null;
      } | null;
      defaultSort?: "MANUAL" | "PRICE" | "NEWEST" | "NAME" | null;
      defaultSortDirection?: "asc" | "desc" | null;
      activeFrom?: string | null;
      activeTo?: string | null;
      publish?: boolean | null;
    };
  }) {
    const mediaFileIds = args.input.media
      ? args.input.media.map((item) =>
          decodeGlobalIdByType(item.fileId, GlobalIdEntity.File)
        )
      : undefined;

    const result = await this.$ctx.kernel.runScript(CollectionUpdateScript, {
      id: args.input.id,
      handle: args.input.handle ?? undefined,
      name: args.input.name ?? undefined,
      description:
        args.input.description === null
          ? null
          : args.input.description
          ? {
              text: args.input.description.text ?? undefined,
              html: args.input.description.html ?? undefined,
              json: args.input.description.json as Record<string, unknown> | undefined,
            }
          : undefined,
      mediaFileIds,
      seo:
        args.input.seo === null
          ? null
          : args.input.seo
          ? {
              seoTitle: args.input.seo.seoTitle ?? undefined,
              seoDescription: args.input.seo.seoDescription ?? undefined,
              ogTitle: args.input.seo.ogTitle ?? undefined,
              ogDescription: args.input.seo.ogDescription ?? undefined,
              ogImageId: args.input.seo.ogImageId
                ? decodeGlobalIdByType(args.input.seo.ogImageId, GlobalIdEntity.File)
                : undefined,
            }
          : undefined,
      defaultSort: args.input.defaultSort?.toLowerCase() as
        | "manual"
        | "price"
        | "newest"
        | "name"
        | undefined,
      defaultSortDirection: (args.input.defaultSortDirection ?? undefined) as
        | "asc"
        | "desc"
        | undefined,
      activeFrom: args.input.activeFrom ?? undefined,
      activeTo: args.input.activeTo ?? undefined,
      publish: args.input.publish ?? undefined,
    });

    return {
      collection: result.collection
        ? new CollectionResolver(result.collection.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async collectionDelete(args: { input: { id: string } }) {
    const result = await this.$ctx.kernel.runScript(CollectionDeleteScript, {
      id: args.input.id,
    });
    return {
      deletedCollectionId: result.deletedCollectionId ?? null,
      userErrors: result.userErrors,
    };
  }

  async collectionAddProducts(args: {
    input: { collectionId: string; productIds: string[] };
  }) {
    const result = await this.$ctx.kernel.runScript(CollectionAddProductsScript, {
      collectionId: args.input.collectionId,
      productIds: args.input.productIds.map((id) =>
        decodeGlobalIdByType(id, GlobalIdEntity.Product)
      ),
    });
    return {
      collection: result.collection
        ? new CollectionResolver(result.collection.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async collectionRemoveProducts(args: {
    input: { collectionId: string; productIds: string[] };
  }) {
    const result = await this.$ctx.kernel.runScript(CollectionRemoveProductsScript, {
      collectionId: args.input.collectionId,
      productIds: args.input.productIds.map((id) =>
        decodeGlobalIdByType(id, GlobalIdEntity.Product)
      ),
    });
    return {
      collection: result.collection
        ? new CollectionResolver(result.collection.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async collectionMoveProduct(args: {
    input: {
      collectionId: string;
      productId: string;
      afterProductId?: string | null;
      beforeProductId?: string | null;
    };
  }) {
    const result = await this.$ctx.kernel.runScript(CollectionMoveProductScript, {
      collectionId: args.input.collectionId,
      productId: decodeGlobalIdByType(args.input.productId, GlobalIdEntity.Product),
      afterProductId: args.input.afterProductId
        ? decodeGlobalIdByType(args.input.afterProductId, GlobalIdEntity.Product)
        : undefined,
      beforeProductId: args.input.beforeProductId
        ? decodeGlobalIdByType(args.input.beforeProductId, GlobalIdEntity.Product)
        : undefined,
    });
    return {
      collection: result.collection
        ? new CollectionResolver(result.collection.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async collectionUpdateRules(args: {
    input: {
      collectionId: string;
      rules: Array<{ field: string; operator: string; value: unknown }>;
    };
  }) {
    const result = await this.$ctx.kernel.runScript(CollectionUpdateRulesScript, {
      collectionId: args.input.collectionId,
      rules: args.input.rules,
    });
    return {
      collection: result.collection
        ? new CollectionResolver(result.collection.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  // ---- Tag Mutations ----

  /**
   * Create a new tag.
   */
  async tagCreate(args: {
    input: {
      handle: string;
      name?: string | null;
    };
  }) {
    const { input } = args;

    const result = await this.$ctx.kernel.runScript(TagCreateScript, {
      handle: input.handle,
      name: input.name ?? undefined,
    });

    return {
      tag: result.tag
        ? new TagResolver(result.tag.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Update an existing tag.
   */
  async tagUpdate(args: {
    input: {
      id: string;
      handle?: string | null;
      name?: string | null;
    };
  }) {
    const { input } = args;

    const id = decodeGlobalIdByType(input.id, GlobalIdEntity.Tag);

    const result = await this.$ctx.kernel.runScript(TagUpdateScript, {
      id,
      handle: input.handle ?? undefined,
      name: input.name ?? undefined,
    });

    return {
      tag: result.tag
        ? new TagResolver(result.tag.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Delete a tag.
   */
  async tagDelete(args: {
    input: {
      id: string;
    };
  }) {
    const { input } = args;

    const id = decodeGlobalIdByType(input.id, GlobalIdEntity.Tag);

    const result = await this.$ctx.kernel.runScript(TagDeleteScript, {
      id,
    });

    return {
      deletedTagId: result.deletedTagId ?? null,
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
        "catalog.productBulkEdit",
        { products, context },
        {
          source: "workflow",
          workflowId: `productBulkEdit:${context.projectId}:${idempotencyKey}`,
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
