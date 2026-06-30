import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { ApolloMutation, ZodResolver } from "@shopana/type-resolver";
import { z } from "zod";
import { CatalogType } from "./CatalogType.js";
import { ProductResolver } from "./ProductResolver.js";
import { VendorResolver } from "./VendorResolver.js";
import { WarehouseResolver } from "./WarehouseResolver.js";
import { InventoryItemResolver } from "./InventoryItemResolver.js";
import { StockResolver } from "./StockResolver.js";
import type { UserError } from "../../kernel/BaseScript.js";

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

function safeDecodeGlobalIds(
  globalIds: readonly string[],
  expectedType: GlobalIdType,
  field: string[]
): { ids: string[]; userErrors: UserError[] } {
  const ids: string[] = [];
  const userErrors: UserError[] = [];

  for (const [index, globalId] of globalIds.entries()) {
    const id = safeDecodeGlobalId(globalId, expectedType);
    if (!id) {
      userErrors.push({
        message: "Invalid ID",
        field: [...field, String(index)],
        code: "INVALID_ID",
      });
      continue;
    }
    ids.push(id);
  }

  return { ids, userErrors };
}

interface WarehouseStockMutationItemInput {
  variantId: string;
  warehouseId: string;
}

interface WarehouseStockMutationInput {
  items: WarehouseStockMutationItemInput[];
}

function WarehouseStockMutationInputSchema() {
  return z.object({
    items: z.array(
      z.object({
        variantId: z.string(),
        warehouseId: z.string(),
      }),
    ),
  });
}
import { VariantResolver } from "./VariantResolver.js";
import { OptionResolver } from "./OptionResolver.js";
import { FeatureResolver } from "./FeatureResolver.js";
import { CategoryResolver } from "./CategoryResolver.js";
import { TagResolver } from "./TagResolver.js";
import { CollectionResolver } from "./CollectionResolver.js";
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
  CategoryDeleteScript,
  CategoryMoveScript,
  CategoryRebalanceScript,
} from "../../scripts/category/index.js";
import type {
  CategoryUpdateParams,
  CategoryUpdateWorkflowInput,
  CategoryUpdateWorkflowResult,
} from "../../workflows/dto/CategoryUpdateWorkflowDto.js";
import {
  TagCreateScript,
  TagUpdateScript,
  TagDeleteScript,
} from "../../scripts/tag/index.js";
import type {
  ProductUpdateWorkflowInput,
  ProductUpdateWorkflowResult,
  ProductUpdateOperation,
  ProductCategoryOperationAction,
  ProductTagOperationAction,
  WorkflowContext,
} from "../../workflows/dto/ProductUpdateWorkflowDto.js";
import type { ProductCreateParams, ProductCreateResult } from "../../sagas/index.js";
import { VendorCreateScript } from "../../scripts/vendor/index.js";
import { InventoryItemUpdateScript } from "../../scripts/inventory-item/index.js";
import {
  WarehouseCreateScript,
  WarehouseDeleteScript,
  WarehouseUpdateScript,
} from "../../scripts/warehouse/index.js";
import {
  WarehouseStockCreateScript,
  WarehouseStockDeleteScript,
} from "../../scripts/stock/index.js";
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
  FacetCreateScript,
  FacetUpdateScript,
  FacetDeleteScript,
  FacetMoveScript,
  FacetRebalanceScript,
  FacetValueCreateScript,
  FacetValueUpdateScript,
  FacetValueDeleteScript,
  FacetValueMergeScript,
  FacetValueUnmergeScript,
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
  ProductUpdateInput,
  ProductDeleteInput,
  ProductUpdateStatusInput,
  BundleCreateInput,
  BundleConfigurationCreateInput,
  BundleConfigurationUpdateInput,
  BundleConfigurationDeleteInput,
  BundleGroupsSyncInput,
  BundlePricingTemplatesSyncInput,
  BundleDependencyRulesSyncInput,
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
  CatalogMutationCategoryCreateArgs,
  CatalogMutationCategoryDeleteArgs,
  CatalogMutationCategoryMoveArgs,
  CatalogMutationCategoryRebalanceArgs,
  CatalogMutationCategoryUpdateArgs,
  CatalogMutationVendorCreateArgs,
  CatalogMutationBundleUpdateArgs,
  CatalogMutationProductUpdateArgs,
  InventoryItemUpdateInput,
  WarehouseCreateInput,
  WarehouseUpdateInput,
  WarehouseDeleteInput,
  RichTextInput,
} from "./generated/types.js";
import {
  CategoryCreateInputSchema,
  CategoryDeleteInputSchema,
  CategoryMoveInputSchema,
  CategoryRebalanceInputSchema,
  VendorCreateInputSchema,
  ProductCreateInputSchema,
  ProductDeleteInputSchema,
  ProductUpdateStatusInputSchema,
  BundleCreateInputSchema,
  BundleConfigurationCreateInputSchema,
  BundleConfigurationUpdateInputSchema,
  BundleConfigurationDeleteInputSchema,
  BundleGroupsSyncInputSchema,
  BundlePricingTemplatesSyncInputSchema,
  BundleDependencyRulesSyncInputSchema,
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
  InventoryItemUpdateInputSchema,
  WarehouseCreateInputSchema,
  WarehouseUpdateInputSchema,
  WarehouseDeleteInputSchema,
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

  inventoryMutation() {
    return new InventoryMutationResolver({}, this.$ctx);
  }
}

/**
 * CatalogMutation namespace resolver.
 * Handles all catalog-related mutations (products, variants, options, features).
 * Does NOT contain inventory mutations (warehouse, stock, dimensions, cost).
 */
export class CatalogMutationResolver extends CatalogType<Record<string, never>> {
  @ZodResolver(InventoryItemUpdateInputSchema())
  async inventoryItemUpdate(args: { input: InventoryItemUpdateInput }) {
    const { input } = args;

    const itemId = decodeGlobalIdByType(
      input.id,
      GlobalIdEntity.InventoryItem
    );

    const item = await this.$ctx.kernel.repository.inventoryItem.findById(itemId);
    if (!item) {
      return {
        inventoryItem: null,
        userErrors: [
          { message: "Inventory item not found", code: "NOT_FOUND", field: ["id"] },
        ],
      };
    }

    const stock = input.stock
      ? {
          warehouseId: decodeGlobalIdByType(
            input.stock.warehouseId,
            GlobalIdEntity.Warehouse
          ),
          onHand: input.stock.onHand,
          unavailable: input.stock.unavailable,
        }
      : undefined;

    const result = await this.$ctx.kernel.runScript(InventoryItemUpdateScript, {
      inventoryItemId: item.id,
      variantId: item.variantId,
      sku: input.sku,
      trackInventory: input.trackInventory ?? undefined,
      continueSellingWhenOutOfStock:
        input.continueSellingWhenOutOfStock ?? undefined,
      stock,
      unitCost: input.unitCost
        ? {
            currency: input.unitCost.currency,
            amountMinor: input.unitCost.amountMinor,
          }
        : undefined,
    });

    return {
      inventoryItem:
        result.userErrors.length === 0
          ? new InventoryItemResolver(item.id, this.$ctx)
          : null,
      userErrors: result.userErrors,
    };
  }

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

  @ZodResolver(WarehouseUpdateInputSchema())
  async warehouseUpdate(args: { input: WarehouseUpdateInput }) {
    const { input } = args;
    const warehouseId = decodeGlobalIdByType(
      input.id,
      GlobalIdEntity.Warehouse
    );

    const result = await this.$ctx.kernel.runScript(WarehouseUpdateScript, {
      id: warehouseId,
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

  @ZodResolver(WarehouseDeleteInputSchema())
  async warehouseDelete(args: { input: WarehouseDeleteInput }) {
    const { input } = args;
    const warehouseId = decodeGlobalIdByType(
      input.id,
      GlobalIdEntity.Warehouse
    );

    const result = await this.$ctx.kernel.runScript(WarehouseDeleteScript, {
      id: warehouseId,
    });

    return {
      deletedWarehouseId: result.deletedWarehouseId
        ? encodeGlobalIdByType(
            result.deletedWarehouseId,
            GlobalIdEntity.Warehouse
          )
        : null,
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(WarehouseStockMutationInputSchema())
  async warehouseStockCreate(args: { input: WarehouseStockMutationInput }) {
    const { input } = args;
    const userErrors: UserError[] = [];
    const decodedItems: WarehouseStockMutationItemInput[] = [];

    for (const [index, item] of input.items.entries()) {
      const fieldPrefix = ["items", String(index)];
      const variantId = safeDecodeGlobalId(
        item.variantId,
        GlobalIdEntity.Variant
      );
      const warehouseId = safeDecodeGlobalId(
        item.warehouseId,
        GlobalIdEntity.Warehouse
      );

      if (!variantId) {
        userErrors.push({
          message: "Invalid variant ID",
          code: "INVALID_ID",
          field: [...fieldPrefix, "variantId"],
        });
        continue;
      }

      if (!warehouseId) {
        userErrors.push({
          message: "Invalid warehouse ID",
          code: "INVALID_ID",
          field: [...fieldPrefix, "warehouseId"],
        });
        continue;
      }

      decodedItems.push({ variantId, warehouseId });
    }

    if (userErrors.length > 0) {
      return { warehouseStocks: [], userErrors };
    }

    const result = await this.$ctx.kernel.runScript(WarehouseStockCreateScript, {
      items: decodedItems,
    });

    return {
      warehouseStocks: result.warehouseStocks.map(
        (stock) => new StockResolver(stock.id, this.$ctx)
      ),
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(WarehouseStockMutationInputSchema())
  async warehouseStockDelete(args: { input: WarehouseStockMutationInput }) {
    const { input } = args;
    const userErrors: UserError[] = [];
    const decodedItems: WarehouseStockMutationItemInput[] = [];

    for (const [index, item] of input.items.entries()) {
      const fieldPrefix = ["items", String(index)];
      const variantId = safeDecodeGlobalId(
        item.variantId,
        GlobalIdEntity.Variant
      );
      const warehouseId = safeDecodeGlobalId(
        item.warehouseId,
        GlobalIdEntity.Warehouse
      );

      if (!variantId) {
        userErrors.push({
          message: "Invalid variant ID",
          code: "INVALID_ID",
          field: [...fieldPrefix, "variantId"],
        });
        continue;
      }

      if (!warehouseId) {
        userErrors.push({
          message: "Invalid warehouse ID",
          code: "INVALID_ID",
          field: [...fieldPrefix, "warehouseId"],
        });
        continue;
      }

      decodedItems.push({ variantId, warehouseId });
    }

    if (userErrors.length > 0) {
      return { deletedWarehouseStockIds: [], userErrors };
    }

    const result = await this.$ctx.kernel.runScript(WarehouseStockDeleteScript, {
      items: decodedItems,
    });

    return {
      deletedWarehouseStockIds: result.deletedWarehouseStockIds.map((stockId) =>
        encodeGlobalIdByType(stockId, GlobalIdEntity.WarehouseStock)
      ),
      userErrors: result.userErrors,
    };
  }

  private mapCategoryUpdateOperations(
    operations: CatalogMutationCategoryUpdateArgs["operations"]
  ):
    | { operations: CategoryUpdateParams | null | undefined }
    | { userErrors: UserError[] } {
    if (operations === undefined || operations === null) {
      return { operations };
    }

    const userErrors: UserError[] = [];

    const seo =
      operations.seo === null
        ? null
        : operations.seo
          ? {
              seoTitle: operations.seo.seoTitle ?? undefined,
              seoDescription: operations.seo.seoDescription ?? undefined,
              ogTitle: operations.seo.ogTitle ?? undefined,
              ogDescription: operations.seo.ogDescription ?? undefined,
              ogImageId: operations.seo.ogImageId
                ? safeDecodeGlobalId(
                    operations.seo.ogImageId,
                    GlobalIdEntity.File
                  )
                : undefined,
            }
          : undefined;

    if (operations.seo?.ogImageId && !seo?.ogImageId) {
      userErrors.push({
        message: "Invalid Open Graph image ID",
        field: ["operations", "seo", "ogImageId"],
        code: "INVALID_ID",
      });
    }

    const fileIds: string[] = [];
    if (operations.media) {
      for (let index = 0; index < operations.media.fileIds.length; index++) {
        const decoded = safeDecodeGlobalId(
          operations.media.fileIds[index],
          GlobalIdEntity.File
        );
        if (!decoded) {
          userErrors.push({
            message: "Invalid media file ID",
            field: ["operations", "media", "fileIds", String(index)],
            code: "INVALID_ID",
          });
        } else {
          fileIds.push(decoded);
        }
      }
    }

    let hierarchy: CategoryUpdateParams["hierarchy"];
    if (operations.hierarchy === null) {
      hierarchy = null;
    } else if (operations.hierarchy) {
      hierarchy = {};
      if (
        Object.prototype.hasOwnProperty.call(operations.hierarchy, "parentId")
      ) {
        const parentId = operations.hierarchy.parentId;
        if (parentId) {
          const decoded = safeDecodeGlobalId(parentId, GlobalIdEntity.Category);
          if (!decoded) {
            userErrors.push({
              message: "Invalid parent category ID",
              field: ["operations", "hierarchy", "parentId"],
              code: "INVALID_ID",
            });
          }
          hierarchy.parentId = decoded;
        } else {
          hierarchy.parentId = null;
        }
      }
    }

    if (userErrors.length > 0) {
      return { userErrors };
    }

    return {
      operations: {
        handle: operations.handle ?? undefined,
        name: operations.name ?? undefined,
        content:
          operations.content === null
            ? null
            : operations.content
              ? {
                  description: mapRichTextInput(
                    operations.content.description
                  ),
                  excerpt: mapRichTextInput(operations.content.excerpt),
                }
              : undefined,
        seo,
        status:
          String(operations.status) === "PUBLISHED"
            ? "published"
            : String(operations.status) === "DRAFT"
              ? "draft"
              : undefined,
        media: operations.media ? { fileIds } : undefined,
        hierarchy,
        sort: operations.sort
          ? {
              defaultSort: String(operations.sort.defaultSort).toLowerCase() as
                | "manual"
                | "price"
                | "newest"
                | "name",
              defaultSortDirection: operations.sort.defaultSortDirection as
                | "asc"
                | "desc",
            }
          : undefined,
      },
    };
  }

  private async emitProductCategoryUpdated(args: {
    productIds: readonly string[] | undefined;
    reason: "assignment" | "rank";
    categoryIds: string[];
  }): Promise<void> {
    const productIds = [...new Set(args.productIds ?? [])];
    if (productIds.length === 0) return;

    const products = await this.$ctx.kernel.repository.product.getByIds(
      productIds
    );
    const revisionByProductId = new Map(
      products.map((product) => [product.id, product.revision])
    );

    for (const productId of productIds) {
      await this.$ctx.kernel.getServices().broker.runWorkflow(
        "events.emit",
        {
          eventType: "productUpdated",
          payload: {
            productId,
            storeId: this.$ctx.store.id,
            revision: revisionByProductId.get(productId) ?? 0,
            product: {
              categories: {
                changed: true,
                reason: args.reason,
                categoryIds: args.categoryIds,
              },
            },
          },
          source: "catalog",
          context: {
            tenantId: this.$ctx.store.organizationId,
            userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
          },
          subject: { type: "product", id: productId },
          actor: this.$ctx.hasUser
            ? { type: "user", id: this.$ctx.user.id }
            : undefined,
          emitKey: `product:${productId}`,
        },
        {
          source: "workflow",
          workflowId: `categoryProduct:${this.$ctx.store.id}:${this.$ctx.requestId}:${productId}`,
          stepId: "emitProductUpdated",
        }
      );

    }
  }

  private async emitProductDeleted(args: {
    productId: string;
    categoryIds: readonly string[] | undefined;
  }): Promise<void> {
    await this.$ctx.kernel.getServices().broker.runWorkflow(
      "events.emit",
      {
        eventType: "productDeleted",
        payload: {
          productId: args.productId,
          storeId: this.$ctx.store.id,
          categoryIds: [...new Set(args.categoryIds ?? [])],
        },
        source: "catalog",
        context: {
          tenantId: this.$ctx.store.organizationId,
          userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
        },
        subject: { type: "product", id: args.productId },
        actor: this.$ctx.hasUser
          ? { type: "user", id: this.$ctx.user.id }
          : undefined,
        emitKey: `product:${args.productId}:deleted`,
      },
      {
        source: "workflow",
        workflowId: `productDelete:${this.$ctx.store.id}:${this.$ctx.requestId}:${args.productId}`,
        stepId: "emitProductDeleted",
      }
    );
  }

  private async emitVariantCreatedProductUpdated(args: {
    productId: string;
    variantId: string;
  }): Promise<void> {
    const product = await this.$ctx.kernel.repository.product.findById(
      args.productId
    );

    await this.$ctx.kernel.getServices().broker.runWorkflow(
      "events.emit",
      {
        eventType: "productUpdated",
        payload: {
          productId: args.productId,
          storeId: this.$ctx.store.id,
          revision: product?.revision ?? 0,
          variants: {
            [args.variantId]: {},
          },
        },
        source: "catalog",
        context: {
          tenantId: this.$ctx.store.organizationId,
          userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
        },
        subject: { type: "product", id: args.productId },
        actor: this.$ctx.hasUser
          ? { type: "user", id: this.$ctx.user.id }
          : undefined,
        emitKey: `product:${args.productId}:variant:${args.variantId}:created`,
      },
      {
        source: "workflow",
        workflowId: `variantCreate:${this.$ctx.store.id}:${this.$ctx.requestId}:${args.variantId}`,
        stepId: "emitProductUpdated",
      }
    );

  }

  private async emitVariantDeleted(args: {
    productId: string;
    variantId: string;
  }): Promise<void> {
    await this.$ctx.kernel.getServices().broker.runWorkflow(
      "events.emit",
      {
        eventType: "variantDeleted",
        payload: {
          productId: args.productId,
          variantId: args.variantId,
          storeId: this.$ctx.store.id,
        },
        source: "catalog",
        context: {
          tenantId: this.$ctx.store.organizationId,
          userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
        },
        subject: { type: "variant", id: args.variantId },
        actor: this.$ctx.hasUser
          ? { type: "user", id: this.$ctx.user.id }
          : undefined,
        emitKey: `variant:${args.variantId}:deleted`,
      },
      {
        source: "workflow",
        workflowId: `variantDelete:${this.$ctx.store.id}:${this.$ctx.requestId}:${args.variantId}`,
        stepId: "emitVariantDeleted",
      }
    );
  }

  // ---- Vendor Mutations ----

  /**
   * Create a new vendor.
   */
  @ZodResolver(VendorCreateInputSchema())
  async vendorCreate(args: CatalogMutationVendorCreateArgs) {
    const result = await this.$ctx.kernel.runScript(VendorCreateScript, {
      name: args.input.name,
    });

    return {
      vendor: result.vendor
        ? new VendorResolver(result.vendor.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

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
    const vendorId = input.vendorId
      ? decodeGlobalIdByType(input.vendorId, GlobalIdEntity.Vendor)
      : undefined;

    const sagaInput: ProductCreateParams = {
      title: input.title,
      handle: input.handle,
      vendorId,
      description: mapRichTextInput(input.description),
      excerpt: mapRichTextInput(input.excerpt),
      mediaFileIds,
      options: input.options?.map((opt) => ({
        name: opt.name,
        slug: opt.slug,
        displayType: opt.displayType ?? undefined,
        sortIndex: opt.sortIndex ?? undefined,
        values: opt.values.map((v) => ({
          name: v.name,
          slug: v.slug,
          sortIndex: v.sortIndex ?? undefined,
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
    const productId = decodeGlobalIdByType(input.id, GlobalIdEntity.Product);

    const result = await this.$ctx.kernel.runScript(ProductDeleteScript, {
      id: productId,
      permanent: input.permanent ?? undefined,
    });

    if (result.userErrors.length === 0 && result.deletedProductId) {
      await this.emitProductDeleted({
        productId: result.deletedProductId,
        categoryIds: result.categoryIds,
      });
    }

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
    const productId = decodeGlobalIdByType(
      input.productId,
      GlobalIdEntity.Product
    );

    const status = input.action === "PUBLISH" ? "published" : "draft";
    const result = await this.$ctx.kernel.runScript(ProductUpdateStatusScript, {
      id: productId,
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
   * Supports product, category, tag, and variant operations in a single request.
   */
  async productUpdate(args: CatalogMutationProductUpdateArgs) {
    const { productId, expectedRevision, operations } = args;
    const decodedProductId = safeDecodeGlobalId(
      productId,
      GlobalIdEntity.Product,
    );
    if (!decodedProductId) {
      const error = {
        message: "Invalid ID format",
        field: ["productId"],
        code: "INVALID_ID",
      };
      return {
        product: null,
        operationResults: [
          {
            type: "PRODUCT_UPDATE",
            applied: false,
            errors: [error],
          },
        ],
        userErrors: [error],
      };
    }

    const mapped = mapProductUpdateInput({
      productId: decodedProductId,
      operations,
      expectedRevision: expectedRevision ?? undefined,
    });

    if (mapped.errors.length > 0) {
      const operationResults = mapped.entries.map((entry) =>
        mapPreflightEntryToGraphqlResult(entry, mapped.errors.length > 0),
      );

      return {
        product: null,
        operationResults,
        userErrors: mapped.errors,
      };
    }

    const workflowInput: ProductUpdateWorkflowInput = {
      productId: decodedProductId,
      expectedRevision: expectedRevision ?? undefined,
      operations: mapped.operations,
      context: {
        organizationId: this.$ctx.store.organizationId,
        projectId: this.$ctx.store.id,
        storeId: this.$ctx.store.id,
        userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
        locale: this.$ctx.locale ?? this.$ctx.store.defaultLocale,
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
          workflowId: `productUpdate:${decodedProductId}:${idempotencyKey}`,
          stepId: "start",
        }
      )) as ProductUpdateWorkflowResult;

    return {
      product: result.product
        ? new ProductResolver(result.product.id, this.$ctx)
        : null,
      operationResults: result.operationResults.map((r) => ({
        type: toGraphqlOperationType(r.type),
        applied: r.applied,
        clientMutationId: r.clientMutationId,
        entityId: r.entityId
          ? encodeGlobalIdByType(r.entityId, GlobalIdEntity.Variant)
          : undefined,
        errors: r.errors,
      })),
      userErrors: result.userErrors,
    };
  }

  // ---- Bundle Mutation Stubs ----

  @ZodResolver(BundleCreateInputSchema())
  async bundleCreate(_args: { input: BundleCreateInput }) {
    return {
      bundle: null,
      userErrors: [],
    };
  }

  async bundleUpdate(_args: CatalogMutationBundleUpdateArgs) {
    return {
      bundle: null,
      userErrors: [],
    };
  }

  @ZodResolver(BundleConfigurationCreateInputSchema())
  async bundleConfigurationCreate(_args: {
    input: BundleConfigurationCreateInput;
  }) {
    return {
      configuration: null,
      userErrors: [],
    };
  }

  @ZodResolver(BundleConfigurationUpdateInputSchema())
  async bundleConfigurationUpdate(_args: {
    input: BundleConfigurationUpdateInput;
  }) {
    return {
      configuration: null,
      userErrors: [],
    };
  }

  @ZodResolver(BundleConfigurationDeleteInputSchema())
  async bundleConfigurationDelete(_args: {
    input: BundleConfigurationDeleteInput;
  }) {
    return {
      deletedConfigurationId: null,
      bundle: null,
      userErrors: [],
    };
  }

  @ZodResolver(BundleGroupsSyncInputSchema())
  async bundleGroupsSync(_args: { input: BundleGroupsSyncInput }) {
    return {
      configuration: null,
      groups: [],
      userErrors: [],
    };
  }

  @ZodResolver(BundlePricingTemplatesSyncInputSchema())
  async bundlePricingTemplatesSync(_args: {
    input: BundlePricingTemplatesSyncInput;
  }) {
    return {
      configuration: null,
      pricingTemplates: [],
      userErrors: [],
    };
  }

  @ZodResolver(BundleDependencyRulesSyncInputSchema())
  async bundleDependencyRulesSync(_args: {
    input: BundleDependencyRulesSyncInput;
  }) {
    return {
      configuration: null,
      dependencyRules: [],
      userErrors: [],
    };
  }

  // ---- Variant Mutations ----

  /**
   * Create a new variant.
   */
  @ZodResolver(VariantCreateInputSchema())
  async variantCreate(args: { input: VariantCreateInput }) {
    const { input } = args;
    const productId = decodeGlobalIdByType(
      input.productId,
      GlobalIdEntity.Product
    );

    const result = await this.$ctx.kernel.runScript(VariantCreateScript, {
      productId,
      options: input.variant.options.map((opt) => ({
        optionId: decodeGlobalIdByType(opt.optionId, GlobalIdEntity.Option),
        optionValueId: decodeGlobalIdByType(
          opt.optionValueId,
          GlobalIdEntity.OptionValue
        ),
      })),
      externalSystem: input.variant.externalSystem ?? undefined,
      externalId: input.variant.externalId ?? undefined,
    });

    if (result.userErrors.length === 0 && result.variant) {
      await this.emitVariantCreatedProductUpdated({
        productId: result.variant.productId,
        variantId: result.variant.id,
      });
    }

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
    const variantId = decodeGlobalIdByType(input.id, GlobalIdEntity.Variant);

    const result = await this.$ctx.kernel.runScript(VariantDeleteScript, {
      id: variantId,
      permanent: Boolean(input.permanent),
    });

    if (
      result.userErrors.length === 0 &&
      result.deletedVariantId &&
      result.productId
    ) {
      await this.emitVariantDeleted({
        productId: result.productId,
        variantId: result.deletedVariantId,
      });
    }

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
    const variantId = decodeGlobalIdByType(
      input.variantId,
      GlobalIdEntity.Variant
    );

    const result = await this.$ctx.kernel.runScript(VariantUpdatePricingScript, {
      variantId,
      currency: input.currency,
      amountMinor: Number(input.amountMinor),
      compareAtMinor: input.compareAtMinor != null
        ? Number(input.compareAtMinor)
        : undefined,
    });

    return {
      variant: result.result
        ? new VariantResolver(variantId, this.$ctx)
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
    const variantId = decodeGlobalIdByType(
      input.variantId,
      GlobalIdEntity.Variant
    );
    const fileIds = input.fileIds.map((fileId) =>
      decodeGlobalIdByType(fileId, GlobalIdEntity.File)
    );

    const result = await this.$ctx.kernel.runScript(VariantUpdateMediaScript, {
      variantId,
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
      sortIndex: input.sortIndex ?? undefined,
      values: input.values.map((v) => ({
        slug: v.slug,
        name: v.name,
        sortIndex: v.sortIndex ?? undefined,
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
      sortIndex: input.sortIndex ?? undefined,
      values: input.values
        ? {
            create: input.values.create?.map((v) => ({
              slug: v.slug,
              name: v.name,
              sortIndex: v.sortIndex ?? undefined,
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
              sortIndex: v.sortIndex ?? undefined,
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
        sortIndex: option.sortIndex,
        slug: option.slug,
        name: option.name,
        displayType: option.displayType,
        values: option.values.map((value) => ({
          id: value.id
            ? decodeGlobalIdByType(value.id, GlobalIdEntity.OptionValue)
            : undefined,
          sortIndex: value.sortIndex,
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
  @ZodResolver(CategoryCreateInputSchema())
  async categoryCreate(args: CatalogMutationCategoryCreateArgs) {
    const { input } = args;

    const userErrors: UserError[] = [];
    const parentId = input.parentId
      ? safeDecodeGlobalId(input.parentId, GlobalIdEntity.Category)
      : undefined;
    if (input.parentId && !parentId) {
      userErrors.push({
        message: "Invalid parent category ID",
        field: ["input", "parentId"],
        code: "INVALID_ID",
      });
    }

    const mediaFileIds: string[] = [];
    if (input.mediaFileIds) {
      for (let index = 0; index < input.mediaFileIds.length; index++) {
        const decoded = safeDecodeGlobalId(
          input.mediaFileIds[index],
          GlobalIdEntity.File
        );
        if (!decoded) {
          userErrors.push({
            message: "Invalid media file ID",
            field: ["input", "mediaFileIds", String(index)],
            code: "INVALID_ID",
          });
        } else {
          mediaFileIds.push(decoded);
        }
      }
    }

    const ogImageId = input.seo?.ogImageId
      ? safeDecodeGlobalId(input.seo.ogImageId, GlobalIdEntity.File)
      : undefined;
    if (input.seo?.ogImageId && !ogImageId) {
      userErrors.push({
        message: "Invalid Open Graph image ID",
        field: ["input", "seo", "ogImageId"],
        code: "INVALID_ID",
      });
    }

    if (userErrors.length > 0) {
      return { category: null, userErrors };
    }

    const result = await this.$ctx.kernel.runScript(CategoryCreateScript, {
      handle: input.handle,
      name: input.name,
      parentId,
      description: input.description
        ? {
            text: input.description.text ?? "",
            html: input.description.html ?? "",
            json: (input.description.json ?? {}) as Record<string, unknown>,
          }
        : undefined,
      excerpt: input.excerpt
        ? {
            text: input.excerpt.text ?? "",
            html: input.excerpt.html ?? "",
            json: (input.excerpt.json ?? {}) as Record<string, unknown>,
          }
        : undefined,
      seo: input.seo
        ? {
            seoTitle: input.seo.seoTitle ?? undefined,
            seoDescription: input.seo.seoDescription ?? undefined,
            ogTitle: input.seo.ogTitle ?? undefined,
            ogDescription: input.seo.ogDescription ?? undefined,
            ogImageId,
          }
        : undefined,
      mediaFileIds: input.mediaFileIds ? mediaFileIds : undefined,
      publish: input.publish ?? undefined,
    });

    return {
      category: result.category
        ? new CategoryResolver(result.category.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async categoryUpdate(args: CatalogMutationCategoryUpdateArgs) {
    let categoryId: string;
    try {
      categoryId = decodeGlobalIdByType(
        args.categoryId,
        GlobalIdEntity.Category
      );
    } catch {
      return {
        category: null,
        operationResults: [],
        userErrors: [
          {
            message: "Invalid category ID",
            field: ["categoryId"],
            code: "INVALID_ID",
          },
        ],
      };
    }

    const mapped = this.mapCategoryUpdateOperations(args.operations);
    if ("userErrors" in mapped) {
      return {
        category: null,
        operationResults: [],
        userErrors: mapped.userErrors,
      };
    }

    const workflowInput: CategoryUpdateWorkflowInput = {
      categoryId,
      expectedRevision: args.expectedRevision ?? undefined,
      operations: mapped.operations,
      context: {
        organizationId: this.$ctx.store.organizationId,
        projectId: this.$ctx.store.id,
        storeId: this.$ctx.store.id,
        userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
        locale: this.$ctx.locale ?? this.$ctx.store.defaultLocale,
      },
    };

    const result = (await this.$ctx.kernel
      .getServices()
      .broker.runWorkflow(
        "catalog.categoryUpdate",
        workflowInput,
        {
          source: "workflow",
          workflowId: `categoryUpdate:${categoryId}:${this.$ctx.requestId}`,
          stepId: "start",
        }
      )) as CategoryUpdateWorkflowResult;

    return {
      category: result.category
        ? new CategoryResolver(result.category.id, this.$ctx)
        : null,
      operationResults: result.operationResults.map((item) => ({
        type: "CATEGORY_UPDATE",
        applied: item.applied,
        errors: item.errors,
      })),
      userErrors: result.userErrors,
    };
  }

  /**
   * Move a category to a new parent.
   */
  @ZodResolver(CategoryMoveInputSchema())
  async categoryMove(args: CatalogMutationCategoryMoveArgs) {
    const { input } = args;

    let id: string;
    let newParentId: string | null;
    try {
      id = decodeGlobalIdByType(input.id, GlobalIdEntity.Category);
      newParentId = input.newParentId
        ? decodeGlobalIdByType(input.newParentId, GlobalIdEntity.Category)
        : null;
    } catch {
      return {
        category: null,
        userErrors: [{ message: "Invalid ID format", code: "INVALID_ID" }],
      };
    }

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

  @ZodResolver(CategoryRebalanceInputSchema())
  async categoryRebalance(args: CatalogMutationCategoryRebalanceArgs) {
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

    if (result.userErrors.length === 0) {
      await this.emitProductCategoryUpdated({
        productIds: result.affectedProductIds,
        reason: "rank",
        categoryIds: [categoryId],
      });
    }

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
  @ZodResolver(CategoryDeleteInputSchema())
  async categoryDelete(args: CatalogMutationCategoryDeleteArgs) {
    const { input } = args;

    let id: string;
    try {
      id = decodeGlobalIdByType(input.id, GlobalIdEntity.Category);
    } catch {
      return {
        deletedCategoryId: null,
        userErrors: [{ message: "Invalid ID format", code: "INVALID_ID" }],
      };
    }

    const result = await this.$ctx.kernel.runScript(CategoryDeleteScript, {
      id,
      permanent: input.permanent ?? undefined,
    });

    return {
      deletedCategoryId: result.deletedCategoryId ?? null,
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
      sources?: Array<{
        handle: string;
        name: string;
      }> | null;
      valueCandidates?: Array<{
        handle: string;
        label: string;
        sourceHandle: string;
      }> | null;
    };
  }) {
    const result = await this.$ctx.kernel.runScript(FacetCreateScript, {
      facetType: args.input.facetType,
      slug: args.input.slug,
      label: args.input.label,
      uiType: args.input.uiType?.toLowerCase(),
      selectionMode: args.input.selectionMode?.toLowerCase(),
      sources: args.input.sources?.map((source) => ({
        handle: source.handle,
        name: source.name,
      })),
      valueCandidates: args.input.valueCandidates?.map((candidate) => ({
        handle: candidate.handle,
        label: candidate.label,
        sourceHandle: candidate.sourceHandle,
      })),
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
    };
  }) {
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.Facet);
    if (!id) {
      return {
        facet: null,
        userErrors: [{ message: "Invalid facet ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }
    const result = await this.$ctx.kernel.runScript(FacetUpdateScript, {
      id,
      slug: args.input.slug ?? undefined,
      label: args.input.label ?? undefined,
      uiType: args.input.uiType?.toLowerCase(),
      selectionMode: args.input.selectionMode?.toLowerCase(),
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

  async facetMove(args: {
    input: {
      id: string;
      afterFacetId?: string | null;
      beforeFacetId?: string | null;
    };
  }) {
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.Facet);
    if (!id) {
      return {
        facet: null,
        userErrors: [{ message: "Invalid facet ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }

    const afterFacetId = args.input.afterFacetId
      ? safeDecodeGlobalId(args.input.afterFacetId, GlobalIdEntity.Facet)
      : undefined;
    if (args.input.afterFacetId && !afterFacetId) {
      return {
        facet: null,
        userErrors: [{ message: "Invalid after facet ID", field: ["input", "afterFacetId"], code: "INVALID_ID" }],
      };
    }

    const beforeFacetId = args.input.beforeFacetId
      ? safeDecodeGlobalId(args.input.beforeFacetId, GlobalIdEntity.Facet)
      : undefined;
    if (args.input.beforeFacetId && !beforeFacetId) {
      return {
        facet: null,
        userErrors: [{ message: "Invalid before facet ID", field: ["input", "beforeFacetId"], code: "INVALID_ID" }],
      };
    }

    const result = await this.$ctx.kernel.runScript(FacetMoveScript, {
      id,
      afterFacetId,
      beforeFacetId,
    });

    return {
      facet: result.facet ? new FacetResolver(result.facet.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  async facetRebalance(_args: { input: { confirm?: boolean | null } }) {
    const result = await this.$ctx.kernel.runScript(FacetRebalanceScript, {});

    return {
      facets: result.facets.map((facet) => new FacetResolver(facet.id, this.$ctx)),
      userErrors: result.userErrors,
    };
  }

  async facetValueCreate(args: {
    input: {
      facetId: string;
      kind?: "SOURCE" | "DISPLAY" | null;
      handle: string;
      label: string;
      sourceValueIds?: string[] | null;
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
    if (args.input.swatchId && !swatchId) {
      return {
        facetValue: null,
        userErrors: [{ message: "Invalid swatch ID", field: ["input", "swatchId"], code: "INVALID_ID" }],
      };
    }

    const decodedSourceValues = safeDecodeGlobalIds(
      args.input.sourceValueIds ?? [],
      GlobalIdEntity.FacetValue,
      ["input", "sourceValueIds"]
    );
    if (decodedSourceValues.userErrors.length > 0) {
      return { facetValue: null, userErrors: decodedSourceValues.userErrors };
    }

    const result = await this.$ctx.kernel.runScript(FacetValueCreateScript, {
      facetId,
      kind: (args.input.kind ?? "DISPLAY").toLowerCase() as "source" | "display",
      handle: args.input.handle,
      label: args.input.label,
      sourceValueIds: decodedSourceValues.ids,
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
      handle?: string | null;
      label?: string | null;
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
    if (args.input.swatchId && !swatchId) {
      return {
        facetValue: null,
        userErrors: [{ message: "Invalid swatch ID", field: ["input", "swatchId"], code: "INVALID_ID" }],
      };
    }
    const result = await this.$ctx.kernel.runScript(FacetValueUpdateScript, {
      id,
      handle: args.input.handle ?? undefined,
      label: args.input.label ?? undefined,
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

  async facetValueMerge(args: {
    input: {
      facetId: string;
      targetDisplayValueId?: string | null;
      targetHandle?: string | null;
      targetLabel?: string | null;
      sourceValueIds: string[];
    };
  }) {
    const facetId = safeDecodeGlobalId(args.input.facetId, GlobalIdEntity.Facet);
    if (!facetId) {
      return {
        facetValue: null,
        sourceValues: [],
        userErrors: [{ message: "Invalid facet ID", field: ["input", "facetId"], code: "INVALID_ID" }],
      };
    }

    const targetDisplayValueId = args.input.targetDisplayValueId
      ? safeDecodeGlobalId(args.input.targetDisplayValueId, GlobalIdEntity.FacetValue)
      : undefined;
    if (args.input.targetDisplayValueId && !targetDisplayValueId) {
      return {
        facetValue: null,
        sourceValues: [],
        userErrors: [{ message: "Invalid target display value ID", field: ["input", "targetDisplayValueId"], code: "INVALID_ID" }],
      };
    }

    const decodedSourceValues = safeDecodeGlobalIds(
      args.input.sourceValueIds,
      GlobalIdEntity.FacetValue,
      ["input", "sourceValueIds"]
    );
    if (decodedSourceValues.userErrors.length > 0) {
      return {
        facetValue: null,
        sourceValues: [],
        userErrors: decodedSourceValues.userErrors,
      };
    }

    const result = await this.$ctx.kernel.runScript(FacetValueMergeScript, {
      facetId,
      targetDisplayValueId: targetDisplayValueId ?? undefined,
      targetHandle: args.input.targetHandle ?? undefined,
      targetLabel: args.input.targetLabel ?? undefined,
      sourceValueIds: decodedSourceValues.ids,
    });

    return {
      facetValue: result.facetValue
        ? new FacetValueResolver(result.facetValue.id, this.$ctx)
        : null,
      sourceValues: result.sourceValues.map(
        (value) => new FacetValueResolver(value.id, this.$ctx)
      ),
      userErrors: result.userErrors,
    };
  }

  async facetValueUnmerge(args: {
    input: {
      sourceValueIds: string[];
      emptyDisplayAction?: "DISABLE" | "DELETE" | "KEEP" | null;
    };
  }) {
    const decodedSourceValues = safeDecodeGlobalIds(
      args.input.sourceValueIds,
      GlobalIdEntity.FacetValue,
      ["input", "sourceValueIds"]
    );
    if (decodedSourceValues.userErrors.length > 0) {
      return {
        sourceValues: [],
        affectedDisplayValues: [],
        userErrors: decodedSourceValues.userErrors,
      };
    }

    const result = await this.$ctx.kernel.runScript(FacetValueUnmergeScript, {
      sourceValueIds: decodedSourceValues.ids,
      emptyDisplayAction: args.input.emptyDisplayAction
        ?.toLowerCase() as "disable" | "delete" | "keep" | undefined,
    });

    return {
      sourceValues: result.sourceValues.map(
        (value) => new FacetValueResolver(value.id, this.$ctx)
      ),
      affectedDisplayValues: result.affectedDisplayValues.map(
        (value) => new FacetValueResolver(value.id, this.$ctx)
      ),
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
      excerpt?: { text?: string | null; html?: string | null; json?: unknown | null } | null;
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
            text: args.input.description.text ?? "",
            html: args.input.description.html ?? "",
            json: (args.input.description.json ?? {}) as Record<string, unknown>,
          }
        : undefined,
      excerpt: args.input.excerpt
        ? {
            text: args.input.excerpt.text ?? "",
            html: args.input.excerpt.html ?? "",
            json: (args.input.excerpt.json ?? {}) as Record<string, unknown>,
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
      excerpt?: { text?: string | null; html?: string | null; json?: unknown | null } | null;
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
              text: args.input.description.text ?? "",
              html: args.input.description.html ?? "",
              json: (args.input.description.json ?? {}) as Record<string, unknown>,
            }
          : undefined,
      excerpt:
        args.input.excerpt === null
          ? null
          : args.input.excerpt
          ? {
              text: args.input.excerpt.text ?? "",
              html: args.input.excerpt.html ?? "",
              json: (args.input.excerpt.json ?? {}) as Record<string, unknown>,
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
      locale: this.$ctx.locale ?? this.$ctx.store.defaultLocale,
    };

    // Map products with transformed operations
    const inputErrors: Array<{
      message: string;
      field?: string[];
      code?: string;
      productId?: string | null;
      variantId?: string | null;
      operation?: string | null;
    }> = [];
    const products: ProductBulkUpdateItem[] = [];

    for (const [index, item] of input.products.entries()) {
      const decodedProductId = safeDecodeGlobalId(
        item.productId,
        GlobalIdEntity.Product,
      );
      if (!decodedProductId) {
        inputErrors.push({
          message: "Invalid ID format",
          field: ["input", "products", String(index), "productId"],
          code: "INVALID_ID",
          productId: item.productId,
        });
        continue;
      }

      const mapped = mapProductUpdateInput({
        productId: decodedProductId,
        operations: item.operations,
        expectedRevision: item.expectedRevision ?? undefined,
        productIndex: index,
      });
      inputErrors.push(...mapped.errors);
      products.push({
        productId: decodedProductId,
        expectedRevision: item.expectedRevision ?? undefined,
        operations: mapped.operations,
      });
    }

    if (inputErrors.length > 0) {
      return {
        job: null,
        userErrors: inputErrors,
      };
    }

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

export class InventoryMutationResolver extends CatalogMutationResolver {}

// ─── Helpers ──────────────────────────────────────────────────

function mapRichTextInput(
  input?: RichTextInput | null
): RichTextInput | null | undefined {
  if (input === undefined) {
    return undefined;
  }

  if (input === null) {
    return null;
  }

  return {
    text: input.text,
    html: input.html,
    json: input.json as Record<string, unknown>,
  };
}

interface ProductUpdateInputMappingArgs {
  productId: string;
  operations?: ProductUpdateInput | null;
  expectedRevision?: number;
  productIndex?: number;
}

interface ProductUpdateMappedEntry {
  type: ProductUpdateOperation["type"];
  operation?: ProductUpdateOperation;
  errors: UserError[];
  clientMutationId?: string;
  entityId?: string;
}

interface ProductUpdateInputMappingResult {
  operations: ProductUpdateOperation[];
  entries: ProductUpdateMappedEntry[];
  errors: UserError[];
}

function mapProductUpdateInput(
  args: ProductUpdateInputMappingArgs,
): ProductUpdateInputMappingResult {
  const { productId, operations, expectedRevision, productIndex } = args;
  const result: ProductUpdateOperation[] = [];
  const entries: ProductUpdateMappedEntry[] = [];
  const errors: UserError[] = [];
  const variants = operations?.variants;
  const categories = operations?.categories;
  const tags = operations?.tags;
  const operationsFieldPrefix = productIndex === undefined
    ? ["operations"]
    : ["input", "products", String(productIndex), "operations"];

  if (hasProductUpdateFields(operations)) {
    const productErrors: UserError[] = [];
    const productOperation = mapProductLevelOperation(
      productId,
      operations,
      operationsFieldPrefix,
      productErrors,
    );

    entries.push({
      type: "productUpdate",
      operation: productOperation,
      errors: productErrors,
    });

    if (productOperation) {
      result.push(productOperation);
    }
    errors.push(...productErrors);
  }

  if (categories) {
    const mapped = mapProductCategoryOperations(
      productId,
      categories,
      productIndex,
    );
    result.push(...mapped.operations);
    entries.push(
      ...mapped.operations.map((operation) => ({
        type: operation.type,
        operation,
        errors: [],
      })),
    );
    errors.push(...mapped.errors);
  }

  if (tags) {
    const mapped = mapProductTagOperations(productId, tags, productIndex);
    result.push(...mapped.operations);
    entries.push(
      ...mapped.operations.map((operation) => ({
        type: operation.type,
        operation,
        errors: [],
      })),
    );
    errors.push(...mapped.errors);
  }

  if (variants) {
    if (expectedRevision === undefined) {
      const field =
        productIndex === undefined
          ? ["expectedRevision"]
          : ["input", "products", String(productIndex), "expectedRevision"];
      errors.push({
        message: "Expected revision is required for variant operations",
        field,
        code: "EXPECTED_REVISION_REQUIRED",
      });
    }

    for (const [variantIndex, input] of variants.entries()) {
      const fieldPrefix = [
        ...operationsFieldPrefix,
        "variants",
        String(variantIndex),
      ];
      const entry = mapVariantOperationInput(productId, input, fieldPrefix);
      entries.push(entry);
      errors.push(...entry.errors);
      if (entry.operation) {
        result.push(entry.operation);
      }
    }
  }

  return { operations: result, entries, errors };
}

function mapProductLevelOperation(
  productId: string,
  operations: NonNullable<ProductUpdateInput>,
  fieldPrefix: string[],
  errors: UserError[],
): ProductUpdateOperation | undefined {
  let vendorId: string | null | undefined;
  if (Object.prototype.hasOwnProperty.call(operations, "vendorId")) {
    vendorId = operations.vendorId
      ? decodeInputId(
          operations.vendorId,
          GlobalIdEntity.Vendor,
          [...fieldPrefix, "vendorId"],
          errors,
        )
      : null;
  }

  let ogImageId: string | undefined;
  if (operations.seo?.ogImageId) {
    ogImageId = decodeInputId(
      operations.seo.ogImageId,
      GlobalIdEntity.File,
      [...fieldPrefix, "seo", "ogImageId"],
      errors,
    );
  }

  const productMediaFileIds = operations.media
    ? decodeInputIds(
        operations.media.fileIds,
        GlobalIdEntity.File,
        [...fieldPrefix, "media", "fileIds"],
        errors,
      )
    : undefined;

  if (errors.length > 0) {
    return undefined;
  }

  return {
    type: "productUpdate",
    params: {
      id: productId,
      handle: operations.handle ?? undefined,
      title: operations.title ?? undefined,
      vendorId,
      content: operations.content
        ? {
            description: mapRichTextInput(operations.content.description),
            excerpt: mapRichTextInput(operations.content.excerpt),
          }
        : undefined,
      seo: operations.seo
        ? {
            title: operations.seo.seoTitle ?? undefined,
            description: operations.seo.seoDescription ?? undefined,
            ogTitle: operations.seo.ogTitle ?? undefined,
            ogDescription: operations.seo.ogDescription ?? undefined,
            ogImageId,
          }
        : undefined,
      status: operations.status
        ? operations.status === "PUBLISHED"
          ? "published"
          : "draft"
        : undefined,
      media: productMediaFileIds ? { fileIds: productMediaFileIds } : undefined,
    },
    meta: { fieldPrefix },
  };
}

type VariantOperationInput = NonNullable<ProductUpdateInput["variants"]>[number];

function mapVariantOperationInput(
  productId: string,
  input: VariantOperationInput,
  fieldPrefix: string[],
): ProductUpdateMappedEntry {
  const errors: UserError[] = [];
  const clientMutationId =
    typeof input.clientMutationId === "string"
      ? input.clientMutationId.trim()
      : undefined;
  const variantId = input.variantId
    ? decodeInputId(
        input.variantId,
        GlobalIdEntity.Variant,
        [...fieldPrefix, "variantId"],
        errors,
      )
    : undefined;

  switch (String(input.action)) {
    case "CREATE": {
      if (input.variantId) {
        errors.push({
          message: "Variant ID is not allowed for create operations",
          field: [...fieldPrefix, "variantId"],
          code: "FIELD_NOT_ALLOWED",
        });
      }
      if (!clientMutationId) {
        errors.push({
          message: "Client mutation ID is required for variant create operations",
          field: [...fieldPrefix, "clientMutationId"],
          code: "REQUIRED",
        });
      }
      if (!input.options) {
        errors.push({
          message: "Options are required for variant create operations",
          field: [...fieldPrefix, "options"],
          code: "REQUIRED",
        });
      }

      const params = mapVariantPayloadParams(input, fieldPrefix, errors);
      const operation =
        errors.length === 0 && clientMutationId && params.options
          ? ({
              type: "variantCreate",
              params: {
                productId,
                clientMutationId,
                options: params.options,
                pricing: params.pricing,
                inventory: params.inventory,
                dimensions: params.dimensions,
                weight: params.weight,
                media: params.media,
              },
              meta: { fieldPrefix },
            } satisfies ProductUpdateOperation)
          : undefined;

      return {
        type: "variantCreate",
        operation,
        errors,
        clientMutationId,
      };
    }

    case "UPDATE": {
      if (!input.variantId) {
        errors.push({
          message: "Variant ID is required for variant update operations",
          field: [...fieldPrefix, "variantId"],
          code: "REQUIRED",
        });
      }
      const params = mapVariantPayloadParams(input, fieldPrefix, errors);
      const operation =
        errors.length === 0 && variantId
          ? ({
              type: "variantUpdate",
              params: {
                variantId,
                pricing: params.pricing,
                inventory: params.inventory,
                dimensions: params.dimensions,
                weight: params.weight,
                media: params.media,
                options: params.options,
              },
              meta: { fieldPrefix },
            } satisfies ProductUpdateOperation)
          : undefined;

      return {
        type: "variantUpdate",
        operation,
        errors,
        entityId: variantId,
      };
    }

    case "DELETE": {
      if (!input.variantId) {
        errors.push({
          message: "Variant ID is required for variant delete operations",
          field: [...fieldPrefix, "variantId"],
          code: "REQUIRED",
        });
      }

      const forbiddenFields: Array<keyof VariantOperationInput> = [
        "clientMutationId",
        "options",
        "pricing",
        "inventory",
        "media",
        "weight",
        "dimensions",
      ];
      for (const field of forbiddenFields) {
        if (input[field] !== undefined && input[field] !== null) {
          errors.push({
            message: `${String(field)} is not allowed for variant delete operations`,
            field: [...fieldPrefix, String(field)],
            code: "FIELD_NOT_ALLOWED",
          });
        }
      }

      const operation =
        errors.length === 0 && variantId
          ? ({
              type: "variantDelete",
              params: { variantId },
              meta: { fieldPrefix },
            } satisfies ProductUpdateOperation)
          : undefined;

      return {
        type: "variantDelete",
        operation,
        errors,
        entityId: variantId,
      };
    }

    default:
      errors.push({
        message: "Unsupported variant operation action",
        field: [...fieldPrefix, "action"],
        code: "INVALID_ACTION",
      });
      return { type: "variantUpdate", errors };
  }
}

function mapVariantPayloadParams(
  input: VariantOperationInput,
  fieldPrefix: string[],
  errors: UserError[],
) {
  const options = input.options
    ? {
        set: input.options.set.map((link, index) => ({
          optionId:
            decodeInputId(
              link.optionId,
              GlobalIdEntity.Option,
              [...fieldPrefix, "options", "set", String(index), "optionId"],
              errors,
            ) ?? "",
          optionValueId:
            decodeInputId(
              link.optionValueId,
              GlobalIdEntity.OptionValue,
              [
                ...fieldPrefix,
                "options",
                "set",
                String(index),
                "optionValueId",
              ],
              errors,
            ) ?? "",
        })),
      }
    : undefined;

  const pricing = input.pricing
    ? {
        currency: input.pricing.currency,
        amountMinor: Number(input.pricing.amountMinor),
        compareAtMinor:
          input.pricing.compareAtMinor === undefined
            ? undefined
            : input.pricing.compareAtMinor === null
              ? null
              : Number(input.pricing.compareAtMinor),
      }
    : undefined;

  const inventory = input.inventory
    ? {
        warehouseId:
          decodeInputId(
            input.inventory.warehouseId,
            GlobalIdEntity.Warehouse,
            [...fieldPrefix, "inventory", "warehouseId"],
            errors,
          ) ?? "",
        onHand: input.inventory.onHand,
        unavailable: input.inventory.unavailable ?? undefined,
        sku: input.inventory.sku,
        unitCostMinor:
          input.inventory.unitCostMinor === undefined
            ? undefined
            : input.inventory.unitCostMinor === null
              ? null
              : Number(input.inventory.unitCostMinor),
        costCurrency: input.inventory.costCurrency,
      }
    : undefined;

  const dimensions = input.dimensions
    ? {
        width: input.dimensions.width,
        height: input.dimensions.height,
        length: input.dimensions.length,
      }
    : undefined;

  const media = input.media
    ? {
        fileIds: decodeInputIds(
          input.media.fileIds,
          GlobalIdEntity.File,
          [...fieldPrefix, "media", "fileIds"],
          errors,
        ),
      }
    : undefined;

  const weight = Object.prototype.hasOwnProperty.call(input, "weight")
    ? input.weight
    : undefined;

  return { options, pricing, inventory, dimensions, weight, media };
}

function decodeInputId(
  value: string,
  expectedType: GlobalIdType,
  field: string[],
  errors: UserError[],
): string | undefined {
  const decoded = safeDecodeGlobalId(value, expectedType);
  if (!decoded) {
    errors.push({
      message: "Invalid ID format",
      field,
      code: "INVALID_ID",
    });
  }
  return decoded ?? undefined;
}

function decodeInputIds(
  values: readonly string[],
  expectedType: GlobalIdType,
  fieldPrefix: string[],
  errors: UserError[],
): string[] {
  return values.map((value, index) =>
    decodeInputId(value, expectedType, [...fieldPrefix, String(index)], errors) ??
    "",
  );
}

function mapPreflightEntryToGraphqlResult(
  entry: ProductUpdateMappedEntry,
  hasBatchErrors: boolean,
) {
  const errors =
    entry.errors.length > 0 || !hasBatchErrors
      ? entry.errors
      : [
          {
            message: "Batch validation failed",
            code: "BATCH_VALIDATION_FAILED",
          },
        ];

  return {
    type: toGraphqlOperationType(entry.type),
    applied: false,
    clientMutationId: entry.clientMutationId,
    entityId: entry.entityId
      ? encodeGlobalIdByType(entry.entityId, GlobalIdEntity.Variant)
      : undefined,
    errors,
  };
}

type ProductCategoryOperationInput = NonNullable<
  NonNullable<ProductBulkUpdateInput["products"][0]["operations"]>["categories"]
>[number];

type ProductTagOperationInput = NonNullable<
  NonNullable<ProductBulkUpdateInput["products"][0]["operations"]>["tags"]
>[number];

function mapProductCategoryOperations(
  productId: string,
  categories: readonly ProductCategoryOperationInput[],
  productIndex?: number,
): { operations: ProductUpdateOperation[]; errors: UserError[] } {
  const operations: ProductUpdateOperation[] = [];
  const errors: UserError[] = [];

  for (const [index, input] of categories.entries()) {
    const fieldPrefix =
      productIndex === undefined
        ? ["operations", "categories", String(index)]
        : [
            "input",
            "products",
            String(productIndex),
            "operations",
            "categories",
            String(index),
          ];

    const categoryId = safeDecodeGlobalId(
      input.categoryId,
      GlobalIdEntity.Category,
    );
    if (!categoryId) {
      errors.push({
        message: "Invalid ID format",
        field: [...fieldPrefix, "categoryId"],
        code: "INVALID_ID",
      });
      continue;
    }

    const afterProductId = input.afterProductId
      ? safeDecodeGlobalId(input.afterProductId, GlobalIdEntity.Product)
      : undefined;
    if (input.afterProductId && !afterProductId) {
      errors.push({
        message: "Invalid ID format",
        field: [...fieldPrefix, "afterProductId"],
        code: "INVALID_ID",
      });
      continue;
    }

    const beforeProductId = input.beforeProductId
      ? safeDecodeGlobalId(input.beforeProductId, GlobalIdEntity.Product)
      : undefined;
    if (input.beforeProductId && !beforeProductId) {
      errors.push({
        message: "Invalid ID format",
        field: [...fieldPrefix, "beforeProductId"],
        code: "INVALID_ID",
      });
      continue;
    }

    operations.push({
      type: "productCategoryUpdate",
      params: {
        productId,
        categoryId,
        action: mapProductCategoryOperationAction(input.action),
        afterProductId,
        beforeProductId,
      },
      meta: { fieldPrefix },
    });
  }

  return { operations, errors };
}

function mapProductCategoryOperationAction(
  action: ProductCategoryOperationInput["action"],
): ProductCategoryOperationAction {
  switch (String(action)) {
    case "ADD":
      return "add";
    case "REMOVE":
      return "remove";
    case "SET_PRIMARY":
      return "setPrimary";
    case "MOVE":
      return "move";
    default:
      throw new Error(`Unsupported product category action: ${String(action)}`);
  }
}

function mapProductTagOperations(
  productId: string,
  tags: readonly ProductTagOperationInput[],
  productIndex?: number,
): { operations: ProductUpdateOperation[]; errors: UserError[] } {
  const operations: ProductUpdateOperation[] = [];
  const errors: UserError[] = [];

  for (const [index, input] of tags.entries()) {
    const fieldPrefix =
      productIndex === undefined
        ? ["operations", "tags", String(index)]
        : [
            "input",
            "products",
            String(productIndex),
            "operations",
            "tags",
            String(index),
          ];

    const tagId = safeDecodeGlobalId(input.tagId, GlobalIdEntity.Tag);
    if (!tagId) {
      errors.push({
        message: "Invalid ID format",
        field: [...fieldPrefix, "tagId"],
        code: "INVALID_ID",
      });
      continue;
    }

    operations.push({
      type: "productTagUpdate",
      params: {
        productId,
        tagId,
        action: mapProductTagOperationAction(input.action),
      },
      meta: { fieldPrefix },
    });
  }

  return { operations, errors };
}

function mapProductTagOperationAction(
  action: ProductTagOperationInput["action"],
): ProductTagOperationAction {
  switch (String(action)) {
    case "ADD":
      return "add";
    case "REMOVE":
      return "remove";
    default:
      throw new Error(`Unsupported product tag action: ${String(action)}`);
  }
}

function toGraphqlOperationType(type: ProductUpdateOperation["type"]) {
  if (type === "productUpdate") {
    return "PRODUCT_UPDATE";
  }
  if (type === "productCategoryUpdate") {
    return "PRODUCT_CATEGORY_UPDATE";
  }
  if (type === "productTagUpdate") {
    return "PRODUCT_TAG_UPDATE";
  }
  if (type === "variantCreate") {
    return "VARIANT_CREATE";
  }
  if (type === "variantDelete") {
    return "VARIANT_DELETE";
  }
  return "VARIANT_UPDATE";
}

function hasProductUpdateFields(
  operations?: ProductUpdateInput | null,
): operations is ProductUpdateInput {
  if (!operations) return false;
  return (
    operations.handle !== undefined ||
    operations.title !== undefined ||
    Object.prototype.hasOwnProperty.call(operations, "vendorId") ||
    operations.content !== undefined ||
    operations.seo !== undefined ||
    operations.status !== undefined ||
    operations.media !== undefined
  );
}
