import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { ApolloMutation, ZodResolver } from "@shopana/type-resolver";
import { CatalogType } from "./CatalogType.js";
import { ProductResolver } from "./ProductResolver.js";

/**
 * Safely decode a global ID, returning null if invalid
 */
function safeDecodeGlobalId(
  globalId: string,
  expectedType: GlobalIdType
): string | null {
  try {
    return decodeGlobalIdByType(globalId, expectedType);
  } catch {
    return null;
  }
}
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
  CategoryAddProductScript,
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
import {
  BundleGroupCreateScript,
  BundleGroupUpdateScript,
  BundleGroupDeleteScript,
  BundleItemCreateScript,
  BundleItemUpdateScript,
  BundleItemDeleteScript,
  BundlePricingTemplateCreateScript,
  BundlePricingTemplateUpdateScript,
  BundlePricingTemplateDeleteScript,
  DependencyRuleCreateScript,
  DependencyRuleUpdateScript,
  DependencyRuleDeleteScript,
  ConditionGroupCreateScript,
  ConditionGroupUpdateScript,
  ConditionGroupDeleteScript,
  ConditionCreateScript,
  ConditionUpdateScript,
  ConditionDeleteScript,
  DependencyActionCreateScript,
  DependencyActionUpdateScript,
  DependencyActionDeleteScript,
} from "../../scripts/bundle/index.js";
import { BundleGroupResolver } from "./BundleGroupResolver.js";
import { BundleItemResolver } from "./BundleItemResolver.js";
import { BundlePricingTemplateResolver } from "./BundlePricingTemplateResolver.js";
import { DependencyRuleResolver } from "./DependencyRuleResolver.js";
import { ConditionGroupResolver } from "./ConditionGroupResolver.js";
import { ConditionResolver } from "./ConditionResolver.js";
import { DependencyActionResolver } from "./DependencyActionResolver.js";
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
        source: "content",
        tenantId: sagaInput.storeId,
        resourceId: sagaInput.handle,
        operation: "productCreate",
        content: input,
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

    const productId = decodeGlobalIdByType(input.productId, GlobalIdEntity.Product);

    const result = await this.$ctx.kernel.runScript(OptionCreateScript, {
      productId,
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

    const productId = safeDecodeGlobalId(input.productId, GlobalIdEntity.Product);
    if (!productId) {
      return {
        product: null,
        options: [],
        userErrors: [
          {
            message: "Invalid product ID format",
            field: ["productId"],
            code: "VALIDATION_ERROR",
          },
        ],
      };
    }

    const result = await this.$ctx.kernel.runScript(OptionsSyncScript, {
      productId,
      options: input.options.map((option) => ({
        id: option.id
          ? decodeGlobalIdByType(option.id, GlobalIdEntity.Option)
          : undefined,
        index: option.index,
        slug: option.slug,
        name: option.name,
        displayType: option.displayType,
        values: option.values.map((value) => ({
          id: value.id
            ? decodeGlobalIdByType(value.id, GlobalIdEntity.OptionValue)
            : undefined,
          index: value.index,
          slug: value.slug,
          name: value.name,
          swatch: value.swatch
            ? {
                swatchType: value.swatch.swatchType,
                colorOne: value.swatch.colorOne ?? undefined,
                colorTwo: value.swatch.colorTwo ?? undefined,
                fileId: value.swatch.fileId
                  ? decodeGlobalIdByType(value.swatch.fileId, GlobalIdEntity.File)
                  : undefined,
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

    const productId = decodeGlobalIdByType(input.productId, GlobalIdEntity.Product);

    const result = await this.$ctx.kernel.runScript(FeatureCreateScript, {
      productId,
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

    const productId = safeDecodeGlobalId(input.productId, GlobalIdEntity.Product);
    if (!productId) {
      return {
        product: null,
        features: [],
        userErrors: [
          {
            message: "Invalid product ID format",
            field: ["productId"],
            code: "VALIDATION_ERROR",
          },
        ],
      };
    }

    const result = await this.$ctx.kernel.runScript(FeaturesSyncScript, {
      productId,
      features: input.features.map((feature) => ({
        id: feature.id
          ? decodeGlobalIdByType(feature.id, GlobalIdEntity.Feature)
          : undefined,
        index: feature.index,
        slug: feature.slug,
        isGroup: feature.isGroup,
        name: feature.name,
        values: feature.values?.map((value) => ({
          id: value.id
            ? decodeGlobalIdByType(value.id, GlobalIdEntity.FeatureValue)
            : undefined,
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
    let categoryId: string;
    let productId: string;
    let afterProductId: string | undefined;
    let beforeProductId: string | undefined;
    try {
      categoryId = decodeGlobalIdByType(input.categoryId, GlobalIdEntity.Category);
      productId = decodeGlobalIdByType(input.productId, GlobalIdEntity.Product);
      afterProductId = input.afterProductId
        ? decodeGlobalIdByType(input.afterProductId, GlobalIdEntity.Product)
        : undefined;
      beforeProductId = input.beforeProductId
        ? decodeGlobalIdByType(input.beforeProductId, GlobalIdEntity.Product)
        : undefined;
    } catch {
      return {
        category: null,
        userErrors: [{ message: "Invalid ID format", code: "INVALID_ID" }],
      };
    }

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

  async categoryAddProduct(args: {
    input: {
      categoryId: string;
      productId: string;
    };
  }) {
    const { input } = args;
    let categoryId: string;
    let productId: string;
    try {
      categoryId = decodeGlobalIdByType(input.categoryId, GlobalIdEntity.Category);
      productId = decodeGlobalIdByType(input.productId, GlobalIdEntity.Product);
    } catch {
      return {
        category: null,
        userErrors: [{ message: "Invalid ID format", code: "INVALID_ID" }],
      };
    }

    const result = await this.$ctx.kernel.runScript(CategoryAddProductScript, {
      categoryId,
      productId,
    });

    return {
      category: result.category
        ? new CategoryResolver(result.category.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async categoryRebalance(args: { input: { categoryId: string } }) {
    let categoryId: string;
    try {
      categoryId = decodeGlobalIdByType(
        args.input.categoryId,
        GlobalIdEntity.Category
      );
    } catch {
      return {
        category: null,
        userErrors: [{ message: "Invalid ID format", code: "INVALID_ID" }],
      };
    }
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
    let id: string;
    try {
      id = decodeGlobalIdByType(args.input.id, GlobalIdEntity.Category);
    } catch {
      return {
        category: null,
        userErrors: [{ message: "Invalid ID format", code: "INVALID_ID" }],
      };
    }
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
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.FacetGroup);
    if (!id) {
      return {
        facetGroup: null,
        userErrors: [{ message: "Invalid facet group ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }
    const result = await this.$ctx.kernel.runScript(FacetGroupUpdateScript, {
      id,
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
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.FacetGroup);
    if (!id) {
      return {
        deletedFacetGroupId: null,
        userErrors: [{ message: "Invalid facet group ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }
    const result = await this.$ctx.kernel.runScript(FacetGroupDeleteScript, {
      id,
    });
    return {
      deletedFacetGroupId: result.deletedFacetGroupId
        ? args.input.id
        : null,
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
    const groupId = args.input.groupId
      ? safeDecodeGlobalId(args.input.groupId, GlobalIdEntity.FacetGroup)
      : undefined;
    const result = await this.$ctx.kernel.runScript(FacetCreateScript, {
      facetType: args.input.facetType.toLowerCase(),
      slug: args.input.slug,
      label: args.input.label,
      uiType: args.input.uiType?.toLowerCase(),
      selectionMode: args.input.selectionMode?.toLowerCase(),
      groupId,
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
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.Facet);
    if (!id) {
      return {
        facet: null,
        userErrors: [{ message: "Invalid facet ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }
    const groupId = args.input.groupId
      ? safeDecodeGlobalId(args.input.groupId, GlobalIdEntity.FacetGroup)
      : args.input.groupId === null
        ? null
        : undefined;
    const result = await this.$ctx.kernel.runScript(FacetUpdateScript, {
      id,
      slug: args.input.slug ?? undefined,
      label: args.input.label ?? undefined,
      uiType: args.input.uiType?.toLowerCase(),
      selectionMode: args.input.selectionMode?.toLowerCase(),
      groupId,
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
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.Facet);
    if (!id) {
      return {
        deletedFacetId: null,
        userErrors: [{ message: "Invalid facet ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }
    const result = await this.$ctx.kernel.runScript(FacetDeleteScript, {
      id,
    });

    return {
      deletedFacetId: result.deletedFacetId ? args.input.id : null,
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
    const facetId = safeDecodeGlobalId(args.input.facetId, GlobalIdEntity.Facet);
    if (!facetId) {
      return {
        facetValue: null,
        userErrors: [{ message: "Invalid facet ID", field: ["input", "facetId"], code: "INVALID_ID" }],
      };
    }
    const swatchId = args.input.swatchId
      ? safeDecodeGlobalId(args.input.swatchId, GlobalIdEntity.FacetSwatch)
      : undefined;
    const result = await this.$ctx.kernel.runScript(FacetValueCreateScript, {
      facetId,
      slug: args.input.slug,
      label: args.input.label,
      sourceHandles: args.input.sourceHandles ?? undefined,
      swatchId,
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
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.FacetValue);
    if (!id) {
      return {
        facetValue: null,
        userErrors: [{ message: "Invalid facet value ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }
    const swatchId = args.input.swatchId
      ? safeDecodeGlobalId(args.input.swatchId, GlobalIdEntity.FacetSwatch)
      : args.input.swatchId === null
        ? null
        : undefined;
    const result = await this.$ctx.kernel.runScript(FacetValueUpdateScript, {
      id,
      slug: args.input.slug ?? undefined,
      label: args.input.label ?? undefined,
      sourceHandles: args.input.sourceHandles ?? undefined,
      swatchId,
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
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.FacetValue);
    if (!id) {
      return {
        deletedFacetValueId: null,
        userErrors: [{ message: "Invalid facet value ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }
    const result = await this.$ctx.kernel.runScript(FacetValueDeleteScript, {
      id,
    });
    return {
      deletedFacetValueId: result.deletedFacetValueId ? args.input.id : null,
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
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.FacetSwatch);
    if (!id) {
      return {
        facetSwatch: null,
        userErrors: [{ message: "Invalid facet swatch ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }
    const result = await this.$ctx.kernel.runScript(FacetSwatchUpdateScript, {
      id,
      swatchType: args.input.swatchType?.toLowerCase(),
      colorOne: args.input.colorOne ?? undefined,
      colorTwo: args.input.colorTwo ?? undefined,
      fileId: args.input.fileId
        ? safeDecodeGlobalId(args.input.fileId, GlobalIdEntity.File)
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
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.FacetSwatch);
    if (!id) {
      return {
        deletedFacetSwatchId: null,
        userErrors: [{ message: "Invalid facet swatch ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }
    const result = await this.$ctx.kernel.runScript(FacetSwatchDeleteScript, {
      id,
    });
    return {
      deletedFacetSwatchId: result.deletedFacetSwatchId ? args.input.id : null,
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
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.Collection);
    if (!id) {
      return {
        collection: null,
        userErrors: [{ message: "Invalid collection ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }
    const mediaFileIds = args.input.media
      ? args.input.media.map((item) =>
          safeDecodeGlobalId(item.fileId, GlobalIdEntity.File)
        ).filter((id): id is string => id !== null)
      : undefined;

    const result = await this.$ctx.kernel.runScript(CollectionUpdateScript, {
      id,
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
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.Collection);
    if (!id) {
      return {
        deletedCollectionId: null,
        userErrors: [{ message: "Invalid collection ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }
    const result = await this.$ctx.kernel.runScript(CollectionDeleteScript, {
      id,
    });
    return {
      deletedCollectionId: result.deletedCollectionId ? args.input.id : null,
      userErrors: result.userErrors,
    };
  }

  async collectionAddProducts(args: {
    input: { collectionId: string; productIds: string[] };
  }) {
    let collectionId: string;
    let productIds: string[];
    try {
      collectionId = decodeGlobalIdByType(args.input.collectionId, GlobalIdEntity.Collection);
      productIds = args.input.productIds.map((id) =>
        decodeGlobalIdByType(id, GlobalIdEntity.Product)
      );
    } catch {
      return {
        collection: null,
        userErrors: [{ message: "Invalid ID format", code: "INVALID_ID" }],
      };
    }
    const result = await this.$ctx.kernel.runScript(CollectionAddProductsScript, {
      collectionId,
      productIds,
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
    let collectionId: string;
    let productIds: string[];
    try {
      collectionId = decodeGlobalIdByType(args.input.collectionId, GlobalIdEntity.Collection);
      productIds = args.input.productIds.map((id) =>
        decodeGlobalIdByType(id, GlobalIdEntity.Product)
      );
    } catch {
      return {
        collection: null,
        userErrors: [{ message: "Invalid ID format", code: "INVALID_ID" }],
      };
    }
    const result = await this.$ctx.kernel.runScript(CollectionRemoveProductsScript, {
      collectionId,
      productIds,
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
    let collectionId: string;
    let productId: string;
    let afterProductId: string | undefined;
    let beforeProductId: string | undefined;
    try {
      collectionId = decodeGlobalIdByType(args.input.collectionId, GlobalIdEntity.Collection);
      productId = decodeGlobalIdByType(args.input.productId, GlobalIdEntity.Product);
      afterProductId = args.input.afterProductId
        ? decodeGlobalIdByType(args.input.afterProductId, GlobalIdEntity.Product)
        : undefined;
      beforeProductId = args.input.beforeProductId
        ? decodeGlobalIdByType(args.input.beforeProductId, GlobalIdEntity.Product)
        : undefined;
    } catch {
      return {
        collection: null,
        userErrors: [{ message: "Invalid ID format", code: "INVALID_ID" }],
      };
    }
    const result = await this.$ctx.kernel.runScript(CollectionMoveProductScript, {
      collectionId,
      productId,
      afterProductId,
      beforeProductId,
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
      collectionId: decodeGlobalIdByType(args.input.collectionId, GlobalIdEntity.Collection),
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

  // ---- Bundle Mutations ----

  async bundleGroupCreate(args: {
    input: {
      productId: string;
      title: string;
      sortIndex?: number | null;
      minSelection?: number | null;
      maxSelection?: number | null;
    };
  }) {
    const productId = safeDecodeGlobalId(args.input.productId, GlobalIdEntity.Product);
    if (!productId) {
      return {
        bundleGroup: null,
        userErrors: [{ message: "Invalid product ID", field: ["input", "productId"], code: "INVALID_ID" }],
      };
    }

    const result = await this.$ctx.kernel.runScript(BundleGroupCreateScript, {
      productId,
      title: args.input.title,
      sortIndex: args.input.sortIndex ?? undefined,
      minSelection: args.input.minSelection,
      maxSelection: args.input.maxSelection,
    });

    return {
      bundleGroup: result.bundleGroup
        ? new BundleGroupResolver(result.bundleGroup.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async bundleGroupUpdate(args: {
    input: {
      id: string;
      title?: string | null;
      sortIndex?: number | null;
      minSelection?: number | null;
      maxSelection?: number | null;
    };
  }) {
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.BundleGroup);
    if (!id) {
      return {
        bundleGroup: null,
        userErrors: [{ message: "Invalid bundle group ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }

    const result = await this.$ctx.kernel.runScript(BundleGroupUpdateScript, {
      id,
      title: args.input.title ?? undefined,
      sortIndex: args.input.sortIndex ?? undefined,
      minSelection: args.input.minSelection,
      maxSelection: args.input.maxSelection,
    });

    return {
      bundleGroup: result.bundleGroup
        ? new BundleGroupResolver(result.bundleGroup.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async bundleGroupDelete(args: { input: { id: string } }) {
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.BundleGroup);
    if (!id) {
      return {
        deletedId: null,
        userErrors: [{ message: "Invalid bundle group ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }

    const result = await this.$ctx.kernel.runScript(BundleGroupDeleteScript, { id });
    return {
      deletedId: result.deletedId ? args.input.id : null,
      userErrors: result.userErrors,
    };
  }

  async bundleItemCreate(args: {
    input: {
      groupId: string;
      itemType: "PRODUCT" | "VARIANT";
      sortIndex?: number | null;
      refProductId?: string | null;
      refVariantId?: string | null;
      title?: string | null;
      featuredImageId?: string | null;
      excludedVariantIds?: string[] | null;
      minQty?: number | null;
      maxQty?: number | null;
      defaultQty?: number | null;
      priceType?: string | null;
      priceValue?: number | null;
      pricingTemplateId?: string | null;
      visible?: boolean | null;
      selected?: boolean | null;
    };
  }) {
    const groupId = safeDecodeGlobalId(args.input.groupId, GlobalIdEntity.BundleGroup);
    if (!groupId) {
      return {
        bundleItem: null,
        userErrors: [{ message: "Invalid group ID", field: ["input", "groupId"], code: "INVALID_ID" }],
      };
    }

    const refProductId = args.input.refProductId
      ? safeDecodeGlobalId(args.input.refProductId, GlobalIdEntity.Product)
      : null;
    const refVariantId = args.input.refVariantId
      ? safeDecodeGlobalId(args.input.refVariantId, GlobalIdEntity.Variant)
      : null;
    const featuredImageId = args.input.featuredImageId
      ? safeDecodeGlobalId(args.input.featuredImageId, GlobalIdEntity.File)
      : null;
    const pricingTemplateId = args.input.pricingTemplateId
      ? safeDecodeGlobalId(args.input.pricingTemplateId, GlobalIdEntity.BundlePricingTemplate)
      : null;
    const excludedVariantIds = args.input.excludedVariantIds
      ?.map((id) => safeDecodeGlobalId(id, GlobalIdEntity.Variant))
      .filter((id): id is string => id !== null);

    const result = await this.$ctx.kernel.runScript(BundleItemCreateScript, {
      groupId,
      itemType: args.input.itemType,
      sortIndex: args.input.sortIndex ?? undefined,
      refProductId,
      refVariantId,
      title: args.input.title,
      featuredImageId,
      excludedVariantIds,
      minQty: args.input.minQty ?? undefined,
      maxQty: args.input.maxQty,
      defaultQty: args.input.defaultQty ?? undefined,
      priceType: args.input.priceType,
      priceValue: args.input.priceValue,
      pricingTemplateId,
      visible: args.input.visible ?? undefined,
      selected: args.input.selected ?? undefined,
    });

    return {
      bundleItem: result.bundleItem
        ? new BundleItemResolver(result.bundleItem.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async bundleItemUpdate(args: {
    input: {
      id: string;
      title?: string | null;
      featuredImageId?: string | null;
      excludedVariantIds?: string[] | null;
      minQty?: number | null;
      maxQty?: number | null;
      defaultQty?: number | null;
      priceType?: string | null;
      priceValue?: number | null;
      pricingTemplateId?: string | null;
      visible?: boolean | null;
      selected?: boolean | null;
      sortIndex?: number | null;
    };
  }) {
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.BundleItem);
    if (!id) {
      return {
        bundleItem: null,
        userErrors: [{ message: "Invalid bundle item ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }

    const featuredImageId = args.input.featuredImageId
      ? safeDecodeGlobalId(args.input.featuredImageId, GlobalIdEntity.File)
      : args.input.featuredImageId;
    const pricingTemplateId = args.input.pricingTemplateId
      ? safeDecodeGlobalId(args.input.pricingTemplateId, GlobalIdEntity.BundlePricingTemplate)
      : args.input.pricingTemplateId;
    const excludedVariantIds = args.input.excludedVariantIds
      ?.map((id) => safeDecodeGlobalId(id, GlobalIdEntity.Variant))
      .filter((id): id is string => id !== null);

    const result = await this.$ctx.kernel.runScript(BundleItemUpdateScript, {
      id,
      title: args.input.title,
      featuredImageId,
      excludedVariantIds,
      minQty: args.input.minQty ?? undefined,
      maxQty: args.input.maxQty,
      defaultQty: args.input.defaultQty ?? undefined,
      priceType: args.input.priceType,
      priceValue: args.input.priceValue,
      pricingTemplateId,
      visible: args.input.visible ?? undefined,
      selected: args.input.selected ?? undefined,
      sortIndex: args.input.sortIndex ?? undefined,
    });

    return {
      bundleItem: result.bundleItem
        ? new BundleItemResolver(result.bundleItem.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async bundleItemDelete(args: { input: { id: string } }) {
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.BundleItem);
    if (!id) {
      return {
        deletedId: null,
        userErrors: [{ message: "Invalid bundle item ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }

    const result = await this.$ctx.kernel.runScript(BundleItemDeleteScript, { id });
    return {
      deletedId: result.deletedId ? args.input.id : null,
      userErrors: result.userErrors,
    };
  }

  async bundlePricingTemplateCreate(args: {
    input: {
      productId: string;
      name: string;
      priceType: string;
      priceValue?: number | null;
      sortIndex?: number | null;
    };
  }) {
    const productId = safeDecodeGlobalId(args.input.productId, GlobalIdEntity.Product);
    if (!productId) {
      return {
        bundlePricingTemplate: null,
        userErrors: [{ message: "Invalid product ID", field: ["input", "productId"], code: "INVALID_ID" }],
      };
    }

    const result = await this.$ctx.kernel.runScript(BundlePricingTemplateCreateScript, {
      productId,
      name: args.input.name,
      priceType: args.input.priceType,
      priceValue: args.input.priceValue,
      sortIndex: args.input.sortIndex ?? undefined,
    });

    return {
      bundlePricingTemplate: result.bundlePricingTemplate
        ? new BundlePricingTemplateResolver(result.bundlePricingTemplate.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async bundlePricingTemplateUpdate(args: {
    input: {
      id: string;
      name?: string | null;
      priceType?: string | null;
      priceValue?: number | null;
      sortIndex?: number | null;
    };
  }) {
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.BundlePricingTemplate);
    if (!id) {
      return {
        bundlePricingTemplate: null,
        userErrors: [{ message: "Invalid pricing template ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }

    const result = await this.$ctx.kernel.runScript(BundlePricingTemplateUpdateScript, {
      id,
      name: args.input.name ?? undefined,
      priceType: args.input.priceType ?? undefined,
      priceValue: args.input.priceValue,
      sortIndex: args.input.sortIndex ?? undefined,
    });

    return {
      bundlePricingTemplate: result.bundlePricingTemplate
        ? new BundlePricingTemplateResolver(result.bundlePricingTemplate.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async bundlePricingTemplateDelete(args: { input: { id: string } }) {
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.BundlePricingTemplate);
    if (!id) {
      return {
        deletedId: null,
        userErrors: [{ message: "Invalid pricing template ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }

    const result = await this.$ctx.kernel.runScript(BundlePricingTemplateDeleteScript, { id });
    return {
      deletedId: result.deletedId ? args.input.id : null,
      userErrors: result.userErrors,
    };
  }

  async dependencyRuleCreate(args: {
    input: {
      productId: string;
      name: string;
      enabled?: boolean | null;
      priority?: number | null;
      logicOperator?: "AND" | "OR" | null;
    };
  }) {
    const productId = safeDecodeGlobalId(args.input.productId, GlobalIdEntity.Product);
    if (!productId) {
      return {
        dependencyRule: null,
        userErrors: [{ message: "Invalid product ID", field: ["input", "productId"], code: "INVALID_ID" }],
      };
    }

    const result = await this.$ctx.kernel.runScript(DependencyRuleCreateScript, {
      productId,
      name: args.input.name,
      enabled: args.input.enabled ?? undefined,
      priority: args.input.priority ?? undefined,
      logicOperator: args.input.logicOperator ?? undefined,
    });

    return {
      dependencyRule: result.dependencyRule
        ? new DependencyRuleResolver(result.dependencyRule.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async dependencyRuleUpdate(args: {
    input: {
      id: string;
      name?: string | null;
      enabled?: boolean | null;
      priority?: number | null;
      logicOperator?: "AND" | "OR" | null;
    };
  }) {
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.DependencyRule);
    if (!id) {
      return {
        dependencyRule: null,
        userErrors: [{ message: "Invalid dependency rule ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }

    const result = await this.$ctx.kernel.runScript(DependencyRuleUpdateScript, {
      id,
      name: args.input.name ?? undefined,
      enabled: args.input.enabled ?? undefined,
      priority: args.input.priority ?? undefined,
      logicOperator: args.input.logicOperator ?? undefined,
    });

    return {
      dependencyRule: result.dependencyRule
        ? new DependencyRuleResolver(result.dependencyRule.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async dependencyRuleDelete(args: { input: { id: string } }) {
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.DependencyRule);
    if (!id) {
      return {
        deletedId: null,
        userErrors: [{ message: "Invalid dependency rule ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }

    const result = await this.$ctx.kernel.runScript(DependencyRuleDeleteScript, { id });
    return {
      deletedId: result.deletedId ? args.input.id : null,
      userErrors: result.userErrors,
    };
  }

  async conditionGroupCreate(args: {
    input: {
      ruleId: string;
      logicOperator?: "AND" | "OR" | null;
      sortIndex?: number | null;
    };
  }) {
    const ruleId = safeDecodeGlobalId(args.input.ruleId, GlobalIdEntity.DependencyRule);
    if (!ruleId) {
      return {
        conditionGroup: null,
        userErrors: [{ message: "Invalid rule ID", field: ["input", "ruleId"], code: "INVALID_ID" }],
      };
    }

    const result = await this.$ctx.kernel.runScript(ConditionGroupCreateScript, {
      ruleId,
      logicOperator: args.input.logicOperator ?? undefined,
      sortIndex: args.input.sortIndex ?? undefined,
    });

    return {
      conditionGroup: result.conditionGroup
        ? new ConditionGroupResolver(result.conditionGroup.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async conditionGroupUpdate(args: {
    input: {
      id: string;
      logicOperator?: "AND" | "OR" | null;
      sortIndex?: number | null;
    };
  }) {
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.ConditionGroup);
    if (!id) {
      return {
        conditionGroup: null,
        userErrors: [{ message: "Invalid condition group ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }

    const result = await this.$ctx.kernel.runScript(ConditionGroupUpdateScript, {
      id,
      logicOperator: args.input.logicOperator ?? undefined,
      sortIndex: args.input.sortIndex ?? undefined,
    });

    return {
      conditionGroup: result.conditionGroup
        ? new ConditionGroupResolver(result.conditionGroup.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async conditionGroupDelete(args: { input: { id: string } }) {
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.ConditionGroup);
    if (!id) {
      return {
        deletedId: null,
        userErrors: [{ message: "Invalid condition group ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }

    const result = await this.$ctx.kernel.runScript(ConditionGroupDeleteScript, { id });
    return {
      deletedId: result.deletedId ? args.input.id : null,
      userErrors: result.userErrors,
    };
  }

  async conditionCreate(args: {
    input: {
      groupId: string;
      category: string;
      subject: string;
      operator: string;
      targetType: string;
      targetId: string;
      value?: number | null;
      sortIndex?: number | null;
    };
  }) {
    const groupId = safeDecodeGlobalId(args.input.groupId, GlobalIdEntity.ConditionGroup);
    if (!groupId) {
      return {
        condition: null,
        userErrors: [{ message: "Invalid group ID", field: ["input", "groupId"], code: "INVALID_ID" }],
      };
    }

    // Decode targetId based on targetType
    let targetId: string | null = null;
    if (args.input.targetType === "ITEM") {
      targetId = safeDecodeGlobalId(args.input.targetId, GlobalIdEntity.BundleItem);
    } else if (args.input.targetType === "GROUP") {
      targetId = safeDecodeGlobalId(args.input.targetId, GlobalIdEntity.BundleGroup);
    } else {
      targetId = args.input.targetId;
    }

    if (!targetId) {
      return {
        condition: null,
        userErrors: [{ message: "Invalid target ID", field: ["input", "targetId"], code: "INVALID_ID" }],
      };
    }

    const result = await this.$ctx.kernel.runScript(ConditionCreateScript, {
      groupId,
      category: args.input.category,
      subject: args.input.subject,
      operator: args.input.operator,
      targetType: args.input.targetType,
      targetId,
      value: args.input.value,
      sortIndex: args.input.sortIndex ?? undefined,
    });

    return {
      condition: result.condition
        ? new ConditionResolver(result.condition.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async conditionUpdate(args: {
    input: {
      id: string;
      category?: string | null;
      subject?: string | null;
      operator?: string | null;
      targetType?: string | null;
      targetId?: string | null;
      value?: number | null;
      sortIndex?: number | null;
    };
  }) {
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.Condition);
    if (!id) {
      return {
        condition: null,
        userErrors: [{ message: "Invalid condition ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }

    // Decode targetId if targetType and targetId are provided
    let targetId: string | undefined;
    if (args.input.targetId && args.input.targetType) {
      if (args.input.targetType === "ITEM") {
        targetId = safeDecodeGlobalId(args.input.targetId, GlobalIdEntity.BundleItem) ?? undefined;
      } else if (args.input.targetType === "GROUP") {
        targetId = safeDecodeGlobalId(args.input.targetId, GlobalIdEntity.BundleGroup) ?? undefined;
      } else {
        targetId = args.input.targetId;
      }
    }

    const result = await this.$ctx.kernel.runScript(ConditionUpdateScript, {
      id,
      category: args.input.category ?? undefined,
      subject: args.input.subject ?? undefined,
      operator: args.input.operator ?? undefined,
      targetType: args.input.targetType ?? undefined,
      targetId,
      value: args.input.value,
      sortIndex: args.input.sortIndex ?? undefined,
    });

    return {
      condition: result.condition
        ? new ConditionResolver(result.condition.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async conditionDelete(args: { input: { id: string } }) {
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.Condition);
    if (!id) {
      return {
        deletedId: null,
        userErrors: [{ message: "Invalid condition ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }

    const result = await this.$ctx.kernel.runScript(ConditionDeleteScript, { id });
    return {
      deletedId: result.deletedId ? args.input.id : null,
      userErrors: result.userErrors,
    };
  }

  async dependencyActionCreate(args: {
    input: {
      ruleId: string;
      actionType: string;
      targetType: string;
      targetId?: string | null;
      requiredValue?: boolean | null;
      priceType?: string | null;
      priceValue?: number | null;
      stackable?: boolean | null;
      sortIndex?: number | null;
    };
  }) {
    const ruleId = safeDecodeGlobalId(args.input.ruleId, GlobalIdEntity.DependencyRule);
    if (!ruleId) {
      return {
        dependencyAction: null,
        userErrors: [{ message: "Invalid rule ID", field: ["input", "ruleId"], code: "INVALID_ID" }],
      };
    }

    // Decode targetId based on targetType
    let targetId: string | null = null;
    if (args.input.targetId) {
      if (args.input.targetType === "ITEM") {
        targetId = safeDecodeGlobalId(args.input.targetId, GlobalIdEntity.BundleItem);
      } else if (args.input.targetType === "GROUP") {
        targetId = safeDecodeGlobalId(args.input.targetId, GlobalIdEntity.BundleGroup);
      } else {
        targetId = args.input.targetId;
      }
    }

    const result = await this.$ctx.kernel.runScript(DependencyActionCreateScript, {
      ruleId,
      actionType: args.input.actionType,
      targetType: args.input.targetType,
      targetId,
      requiredValue: args.input.requiredValue,
      priceType: args.input.priceType,
      priceValue: args.input.priceValue,
      stackable: args.input.stackable ?? undefined,
      sortIndex: args.input.sortIndex ?? undefined,
    });

    return {
      dependencyAction: result.dependencyAction
        ? new DependencyActionResolver(result.dependencyAction.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async dependencyActionUpdate(args: {
    input: {
      id: string;
      actionType?: string | null;
      targetType?: string | null;
      targetId?: string | null;
      requiredValue?: boolean | null;
      priceType?: string | null;
      priceValue?: number | null;
      stackable?: boolean | null;
      sortIndex?: number | null;
    };
  }) {
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.DependencyAction);
    if (!id) {
      return {
        dependencyAction: null,
        userErrors: [{ message: "Invalid dependency action ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }

    // Decode targetId if targetType and targetId are provided
    let targetId: string | null | undefined;
    if (args.input.targetId !== undefined && args.input.targetType) {
      if (args.input.targetId === null) {
        targetId = null;
      } else if (args.input.targetType === "ITEM") {
        targetId = safeDecodeGlobalId(args.input.targetId, GlobalIdEntity.BundleItem);
      } else if (args.input.targetType === "GROUP") {
        targetId = safeDecodeGlobalId(args.input.targetId, GlobalIdEntity.BundleGroup);
      } else {
        targetId = args.input.targetId;
      }
    }

    const result = await this.$ctx.kernel.runScript(DependencyActionUpdateScript, {
      id,
      actionType: args.input.actionType ?? undefined,
      targetType: args.input.targetType ?? undefined,
      targetId,
      requiredValue: args.input.requiredValue,
      priceType: args.input.priceType,
      priceValue: args.input.priceValue,
      stackable: args.input.stackable ?? undefined,
      sortIndex: args.input.sortIndex ?? undefined,
    });

    return {
      dependencyAction: result.dependencyAction
        ? new DependencyActionResolver(result.dependencyAction.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async dependencyActionDelete(args: { input: { id: string } }) {
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.DependencyAction);
    if (!id) {
      return {
        deletedId: null,
        userErrors: [{ message: "Invalid dependency action ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }

    const result = await this.$ctx.kernel.runScript(DependencyActionDeleteScript, { id });
    return {
      deletedId: result.deletedId ? args.input.id : null,
      userErrors: result.userErrors,
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
