import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { ApolloMutation, ZodResolver } from "@shopana/type-resolver";
import { z } from "zod";
import { CatalogType } from "./CatalogType.js";
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
import { ProductDeleteScript } from "../../scripts/product/index.js";
import {
  CategoryCreateScript,
  CategoryDeleteScript,
  CategoryMoveScript,
  CategoryProductsCountRefreshScript,
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
import {
  OptionCategoryCreateScript,
  OptionCategoryDeleteScript,
  OptionCategoryUpdateScript,
} from "../../scripts/option-category/index.js";
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
  CatalogMutationCategoryCreateArgs,
  CatalogMutationCategoryDeleteArgs,
  CatalogMutationCategoryMoveArgs,
  CatalogMutationCategoryRebalanceArgs,
  CatalogMutationCategoryUpdateArgs,
  CatalogMutationVendorCreateArgs,
  CatalogMutationProductOptionCategoryCreateArgs,
  CatalogMutationProductOptionCategoryDeleteArgs,
  CatalogMutationProductOptionCategoryUpdateArgs,
  CatalogMutationProductUpdateArgs,
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
  ProductOptionCategoryCreateInputSchema,
  ProductOptionCategoryDeleteInputSchema,
  ProductOptionCategoryUpdateInputSchema,
  ProductCreateInputSchema,
  ProductDeleteInputSchema,
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
    return this.resolvers.catalogMutation();
  }

  inventoryMutation() {
    return this.resolvers.inventoryMutation();
  }
}

/**
 * CatalogMutation namespace resolver.
 * Handles all catalog-related mutations (products, variants, options, features).
 * Does NOT contain inventory mutations (warehouse, stock, dimensions, cost).
 */
export class CatalogMutationResolver extends CatalogType<Record<string, never>> {
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
        ? await this.resolvers.warehouse(result.warehouse.id)
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
        ? await this.resolvers.warehouse(result.warehouse.id)
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
      warehouseStocks: await Promise.all(
        result.warehouseStocks.map((stock) => this.resolvers.stock(stock.id))
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

    if (args.reason === "assignment" && args.categoryIds.length > 0) {
      const result = await this.$ctx.kernel.runScript(
        CategoryProductsCountRefreshScript,
        { categoryIds: args.categoryIds },
      );

      if (!result.success) {
        throw new Error("Failed to refresh category product counts");
      }
    }

    for (const productId of productIds) {
      await this.$ctx.kernel.getServices().broker.runWorkflow(
        "events.emit",
        {
          eventType: "productUpdated",
          payload: {
            productId,
            storeId: this.$ctx.store.id,
            reasons: ["category"],
          },
          context: {
            organizationId: this.$ctx.store.organizationId,
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

  private async emitProductTagUpdated(args: {
    productIds: readonly string[];
    tagId: string;
    operation: "update" | "delete";
  }): Promise<void> {
    for (const productId of new Set(args.productIds)) {
      await this.$ctx.kernel.getServices().broker.runWorkflow(
        "events.emit",
        {
          eventType: "productUpdated",
          payload: {
            productId,
            storeId: this.$ctx.store.id,
            reasons: ["tag"],
          },
          context: {
            organizationId: this.$ctx.store.organizationId,
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
          workflowId: `tagDefinition:${args.operation}:${this.$ctx.store.id}:${this.$ctx.requestId}:${args.tagId}:${productId}`,
          stepId: "emitProductUpdated",
        },
      );
    }
  }

  private async emitProductDeleted(args: {
    productId: string;
    categoryIds: readonly string[] | undefined;
    deletedAt?: string;
  }): Promise<void> {
    await this.$ctx.kernel.getServices().broker.runWorkflow(
      "events.emit",
      {
        eventType: "productDeleted",
        payload: {
          productId: args.productId,
          storeId: this.$ctx.store.id,
          categoryIds: [...new Set(args.categoryIds ?? [])],
          deletedAt: args.deletedAt,
          entityType: "product",
        },
        context: {
          organizationId: this.$ctx.store.organizationId,
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
        ? await this.resolvers.vendor(result.vendor.id)
        : null,
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(ProductOptionCategoryCreateInputSchema())
  async productOptionCategoryCreate(
    args: CatalogMutationProductOptionCategoryCreateArgs
  ) {
    const result = await this.$ctx.kernel.runScript(
      OptionCategoryCreateScript,
      args.input
    );
    return {
      category: result.category
        ? await this.resolvers.optionCategory(result.category.id)
        : null,
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(ProductOptionCategoryUpdateInputSchema())
  async productOptionCategoryUpdate(
    args: CatalogMutationProductOptionCategoryUpdateArgs
  ) {
    const id = decodeGlobalIdByType(
      args.input.id,
      GlobalIdEntity.OptionCategory
    );
    const result = await this.$ctx.kernel.runScript(
      OptionCategoryUpdateScript,
      {
        id,
        name: args.input.name ?? undefined,
        slug: args.input.slug ?? undefined,
      }
    );
    return {
      category: result.category
        ? await this.resolvers.optionCategory(result.category.id)
        : null,
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(ProductOptionCategoryDeleteInputSchema())
  async productOptionCategoryDelete(
    args: CatalogMutationProductOptionCategoryDeleteArgs
  ) {
    const id = decodeGlobalIdByType(
      args.input.id,
      GlobalIdEntity.OptionCategory
    );
    const result = await this.$ctx.kernel.runScript(
      OptionCategoryDeleteScript,
      { id }
    );
    return {
      deletedCategoryId: result.deletedCategoryId
        ? encodeGlobalIdByType(
            result.deletedCategoryId,
            GlobalIdEntity.OptionCategory
          )
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
        categoryId: decodeGlobalIdByType(
          opt.categoryId,
          GlobalIdEntity.OptionCategory
        ),
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
            requiresShipping: input.inventoryItem.requiresShipping,
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
        organizationId: sagaInput.organizationId,
        resourceId: sagaInput.handle,
        operation: "productCreate",
        content: input,
      },
      { adminContext: this.$ctx.adminContext },
    );

    const result = sagaResult.data!;

    return {
      product: result.product
        ? await this.resolvers.product(result.product.id)
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
        deletedAt: result.deletedAt,
      });
    }

    return {
      deletedProductId: result.deletedProductId
        ? encodeGlobalIdByType(result.deletedProductId, GlobalIdEntity.Product)
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
        },
        { adminContext: this.$ctx.adminContext },
      )) as ProductUpdateWorkflowResult;

    return {
      product: result.product
        ? await this.resolvers.product(result.product.id)
        : null,
      operationResults: result.operationResults.map((r) => ({
        type: toGraphqlOperationType(r.type),
        applied: r.applied,
        clientMutationId: r.clientMutationId,
        entityId: r.entityId
          ? encodeGlobalIdByType(r.entityId, operationResultEntityType(r.type))
          : undefined,
        errors: r.errors,
      })),
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
        ? await this.resolvers.category(result.category.id)
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
        },
        { adminContext: this.$ctx.adminContext },
      )) as CategoryUpdateWorkflowResult;

    return {
      category: result.category
        ? await this.resolvers.category(result.category.id)
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
        ? await this.resolvers.category(result.category.id)
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
        ? await this.resolvers.category(result.category.id)
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
        ? await this.resolvers.collection(result.collection.id)
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
        ? await this.resolvers.collection(result.collection.id)
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
        ? await this.resolvers.collection(result.collection.id)
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
        ? await this.resolvers.collection(result.collection.id)
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
        ? await this.resolvers.collection(result.collection.id)
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
        ? await this.resolvers.collection(result.collection.id)
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
        ? await this.resolvers.tag(result.tag.id)
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
    const productLinks = await this.$ctx.kernel.repository.tag.getTagProductLinks([
      id,
    ]);

    const result = await this.$ctx.kernel.runScript(TagUpdateScript, {
      id,
      handle: input.handle ?? undefined,
      name: input.name ?? undefined,
    });

    if (result.userErrors.length === 0 && result.tag) {
      await this.emitProductTagUpdated({
        productIds: productLinks.map((link) => link.productId),
        tagId: id,
        operation: "update",
      });
    }

    return {
      tag: result.tag
        ? await this.resolvers.tag(result.tag.id)
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
    const productLinks = await this.$ctx.kernel.repository.tag.getTagProductLinks([
      id,
    ]);

    const result = await this.$ctx.kernel.runScript(TagDeleteScript, {
      id,
    });

    if (result.userErrors.length === 0 && result.deletedTagId) {
      await this.emitProductTagUpdated({
        productIds: productLinks.map((link) => link.productId),
        tagId: id,
        operation: "delete",
      });
    }

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
          workflowId: `productBulkEdit:${context.storeId}:${idempotencyKey}`,
          stepId: "start",
        },
        { adminContext: this.$ctx.adminContext },
      )) as { jobId: string };

    return {
      job: result.jobId
        ? await this.resolvers.productBulkUpdateJob(result.jobId)
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
  const options = operations?.options;
  const features = operations?.features;
  const components = operations?.components;
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

  if (options) {
    const mapped = mapProductOptionsSyncOperation(
      productId,
      options,
      operationsFieldPrefix,
    );
    entries.push(mapped.entry);
    errors.push(...mapped.entry.errors);
    if (mapped.entry.operation) result.push(mapped.entry.operation);
  }

  if (features) {
    const mapped = mapProductFeaturesSyncOperation(
      productId,
      features,
      operationsFieldPrefix,
    );
    entries.push(mapped.entry);
    errors.push(...mapped.entry.errors);
    if (mapped.entry.operation) result.push(mapped.entry.operation);
  }

  if (components) {
    if (expectedRevision === undefined) {
      const field =
        productIndex === undefined
          ? ["expectedRevision"]
          : ["input", "products", String(productIndex), "expectedRevision"];
      errors.push({
        message: "Expected revision is required for product component operations",
        field,
        code: "EXPECTED_REVISION_REQUIRED",
      });
    }

    for (const [componentIndex, input] of components.entries()) {
      const fieldPrefix = [
        ...operationsFieldPrefix,
        "components",
        String(componentIndex),
      ];
      const entry = mapProductComponentOperationInput(
        productId,
        input,
        fieldPrefix,
      );
      entries.push(entry);
      errors.push(...entry.errors);
      if (entry.operation) result.push(entry.operation);
    }
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

type ProductComponentOperationInput =
  NonNullable<ProductUpdateInput["components"]>[number];

function mapProductComponentOperationInput(
  productId: string,
  input: ProductComponentOperationInput,
  fieldPrefix: string[],
): ProductUpdateMappedEntry {
  const errors: UserError[] = [];
  const action = String(input.action);
  const configurationId = input.configurationId
    ? decodeInputId(
        input.configurationId,
        GlobalIdEntity.ProductComponentConfiguration,
        [...fieldPrefix, "configurationId"],
        errors,
      )
    : undefined;
  const clientMutationId =
    typeof input.clientMutationId === "string"
      ? input.clientMutationId.trim()
      : undefined;
  const name = typeof input.name === "string" ? input.name.trim() : undefined;

  const requireConfigurationId = () => {
    if (!input.configurationId) {
      errors.push({
        message: "Configuration ID is required for this operation",
        field: [...fieldPrefix, "configurationId"],
        code: "REQUIRED",
      });
    }
  };
  const forbid = (
    allowed: Array<keyof ProductComponentOperationInput>,
  ): void => {
    const allowedSet = new Set<keyof ProductComponentOperationInput>([
      "action",
      ...allowed,
    ]);
    for (const key of [
      "configurationId",
      "clientMutationId",
      "displayStyle",
      "name",
      "groups",
      "pricingTemplates",
      "dependencyRules",
    ] as Array<keyof ProductComponentOperationInput>) {
      if (
        !allowedSet.has(key) &&
        input[key] !== undefined &&
        input[key] !== null
      ) {
        errors.push({
          message: `${String(key)} is not allowed for this operation`,
          field: [...fieldPrefix, String(key)],
          code: "FIELD_NOT_ALLOWED",
        });
      }
    }
  };

  switch (action) {
    case "SETTINGS_UPDATE": {
      forbid(["displayStyle"]);
      if (!input.displayStyle) {
        errors.push({
          message: "Display style is required for settings update",
          field: [...fieldPrefix, "displayStyle"],
          code: "REQUIRED",
        });
      }
      const operation =
        errors.length === 0 && input.displayStyle
          ? ({
              type: "productComponentSettingsUpdate",
              params: { productId, displayStyle: input.displayStyle },
              meta: { fieldPrefix },
            } satisfies ProductUpdateOperation)
          : undefined;
      return { type: "productComponentSettingsUpdate", operation, errors };
    }
    case "REMOVE": {
      forbid([]);
      const operation =
        errors.length === 0
          ? ({
              type: "productComponentRemove",
              params: { productId },
              meta: { fieldPrefix },
            } satisfies ProductUpdateOperation)
          : undefined;
      return { type: "productComponentRemove", operation, errors };
    }
    case "CONFIGURATION_CREATE": {
      forbid(["clientMutationId", "name"]);
      if (!clientMutationId) {
        errors.push({
          message: "Client mutation ID is required for configuration create",
          field: [...fieldPrefix, "clientMutationId"],
          code: "REQUIRED",
        });
      }
      if (!name) {
        errors.push({
          message: "Configuration name is required",
          field: [...fieldPrefix, "name"],
          code: "REQUIRED",
        });
      }
      const operation =
        errors.length === 0 && clientMutationId && name
          ? ({
              type: "productComponentConfigurationCreate",
              params: { productId, clientMutationId, name },
              meta: { fieldPrefix },
            } satisfies ProductUpdateOperation)
          : undefined;
      return {
        type: "productComponentConfigurationCreate",
        operation,
        errors,
        clientMutationId,
      };
    }
    case "CONFIGURATION_UPDATE": {
      forbid(["configurationId", "name"]);
      requireConfigurationId();
      if (!name) {
        errors.push({
          message: "Configuration name is required",
          field: [...fieldPrefix, "name"],
          code: "REQUIRED",
        });
      }
      const operation =
        errors.length === 0 && configurationId && name
          ? ({
              type: "productComponentConfigurationUpdate",
              params: { productId, configurationId, name },
              meta: { fieldPrefix },
            } satisfies ProductUpdateOperation)
          : undefined;
      return {
        type: "productComponentConfigurationUpdate",
        operation,
        errors,
        entityId: configurationId,
      };
    }
    case "CONFIGURATION_DELETE": {
      forbid(["configurationId"]);
      requireConfigurationId();
      const operation =
        errors.length === 0 && configurationId
          ? ({
              type: "productComponentConfigurationDelete",
              params: { productId, configurationId },
              meta: { fieldPrefix },
            } satisfies ProductUpdateOperation)
          : undefined;
      return {
        type: "productComponentConfigurationDelete",
        operation,
        errors,
        entityId: configurationId,
      };
    }
    case "GROUPS_SYNC": {
      forbid(["configurationId", "groups"]);
      requireConfigurationId();
      if (!input.groups) {
        errors.push({
          message: "Groups are required for groups sync",
          field: [...fieldPrefix, "groups"],
          code: "REQUIRED",
        });
      }
      const groups = input.groups
        ? mapProductComponentGroups(input.groups, fieldPrefix, errors)
        : undefined;
      const operation =
        errors.length === 0 && configurationId && groups
          ? ({
              type: "productComponentGroupsSync",
              params: { productId, configurationId, groups },
              meta: { fieldPrefix },
            } satisfies ProductUpdateOperation)
          : undefined;
      return {
        type: "productComponentGroupsSync",
        operation,
        errors,
        entityId: configurationId,
      };
    }
    case "PRICING_TEMPLATES_SYNC": {
      forbid(["configurationId", "pricingTemplates"]);
      requireConfigurationId();
      if (!input.pricingTemplates) {
        errors.push({
          message: "Pricing templates are required for pricing templates sync",
          field: [...fieldPrefix, "pricingTemplates"],
          code: "REQUIRED",
        });
      }
      const pricingTemplates = input.pricingTemplates?.map((template, index) => ({
        id: template.id
          ? decodeInputId(
              template.id,
              GlobalIdEntity.ProductComponentPricingTemplate,
              [...fieldPrefix, "pricingTemplates", String(index), "id"],
              errors,
            )
          : undefined,
        name: template.name,
        sortIndex: template.sortIndex,
        priceRule: mapProductComponentPriceRule(
          template.priceRule,
          [...fieldPrefix, "pricingTemplates", String(index), "priceRule"],
          errors,
        ),
      }));
      const operation =
        errors.length === 0 && configurationId && pricingTemplates
          ? ({
              type: "productComponentPricingTemplatesSync",
              params: { productId, configurationId, pricingTemplates },
              meta: { fieldPrefix },
            } satisfies ProductUpdateOperation)
          : undefined;
      return {
        type: "productComponentPricingTemplatesSync",
        operation,
        errors,
        entityId: configurationId,
      };
    }
    case "DEPENDENCY_RULES_SYNC": {
      forbid(["configurationId", "dependencyRules"]);
      requireConfigurationId();
      if (!input.dependencyRules) {
        errors.push({
          message: "Dependency rules are required for dependency rules sync",
          field: [...fieldPrefix, "dependencyRules"],
          code: "REQUIRED",
        });
      }
      const dependencyRules = input.dependencyRules
        ? mapProductComponentDependencyRules(
            input.dependencyRules,
            fieldPrefix,
            errors,
          )
        : undefined;
      const operation =
        errors.length === 0 && configurationId && dependencyRules
          ? ({
              type: "productComponentDependencyRulesSync",
              params: { productId, configurationId, dependencyRules },
              meta: { fieldPrefix },
            } satisfies ProductUpdateOperation)
          : undefined;
      return {
        type: "productComponentDependencyRulesSync",
        operation,
        errors,
        entityId: configurationId,
      };
    }
    default:
      errors.push({
        message: "Unsupported product component operation action",
        field: [...fieldPrefix, "action"],
        code: "INVALID_ACTION",
      });
      return { type: "productComponentSettingsUpdate", errors };
  }
}

function mapProductComponentGroups(
  groups: NonNullable<ProductComponentOperationInput["groups"]>,
  operationPrefix: string[],
  errors: UserError[],
) {
  return groups.map((group, groupIndex) => {
    const prefix = [...operationPrefix, "groups", String(groupIndex)];
    return {
      id: group.id
        ? decodeInputId(
            group.id,
            GlobalIdEntity.ProductComponentGroup,
            [...prefix, "id"],
            errors,
          )
        : undefined,
      title: group.title,
      minSelection: group.minSelection,
      maxSelection: group.maxSelection,
      sortIndex: group.sortIndex,
      items: group.items.map((item, itemIndex) => {
        const itemPrefix = [...prefix, "items", String(itemIndex)];
        const priceRule = item.priceRule
          ? mapProductComponentPriceRule(
              item.priceRule,
              [...itemPrefix, "priceRule"],
              errors,
            )
          : item.priceRule;
        if (item.priceRule && item.pricingTemplateId) {
          errors.push({
            message: "Inline price rule and pricing template cannot be used together",
            field: [...itemPrefix, "priceRule"],
            code: "MUTUALLY_EXCLUSIVE",
          });
        }
        if (String(item.itemType) === "PRODUCT" && !item.refProductId) {
          errors.push({
            message: "Referenced product ID is required for product items",
            field: [...itemPrefix, "refProductId"],
            code: "REQUIRED",
          });
        }
        if (String(item.itemType) === "PRODUCT" && item.refVariantId) {
          errors.push({
            message: "Referenced variant ID is not allowed for product items",
            field: [...itemPrefix, "refVariantId"],
            code: "FIELD_NOT_ALLOWED",
          });
        }
        if (String(item.itemType) === "VARIANT" && !item.refVariantId) {
          errors.push({
            message: "Referenced variant ID is required for variant items",
            field: [...itemPrefix, "refVariantId"],
            code: "REQUIRED",
          });
        }
        if (String(item.itemType) === "VARIANT" && item.refProductId) {
          errors.push({
            message: "Referenced product ID is not allowed for variant items",
            field: [...itemPrefix, "refProductId"],
            code: "FIELD_NOT_ALLOWED",
          });
        }
        if (
          String(item.itemType) === "VARIANT" &&
          item.optionSelections != null
        ) {
          errors.push({
            message: "Option selections are only allowed for product items",
            field: [...itemPrefix, "optionSelections"],
            code: "FIELD_NOT_ALLOWED",
          });
        }
        return {
          id: item.id
            ? decodeInputId(
                item.id,
                GlobalIdEntity.ProductComponentItem,
                [...itemPrefix, "id"],
                errors,
              )
            : undefined,
          itemType: item.itemType,
          refProductId: item.refProductId
            ? decodeInputId(
                item.refProductId,
                GlobalIdEntity.Product,
                [...itemPrefix, "refProductId"],
                errors,
              )
            : item.refProductId,
          refVariantId: item.refVariantId
            ? decodeInputId(
                item.refVariantId,
                GlobalIdEntity.Variant,
                [...itemPrefix, "refVariantId"],
                errors,
              )
            : item.refVariantId,
          featuredImageId: item.featuredImageId
            ? decodeInputId(
                item.featuredImageId,
                GlobalIdEntity.File,
                [...itemPrefix, "featuredImageId"],
                errors,
              )
            : item.featuredImageId,
          minQty: item.minQty,
          maxQty: item.maxQty,
          defaultQty: item.defaultQty,
          priceRule,
          pricingTemplateId: item.pricingTemplateId
            ? decodeInputId(
                item.pricingTemplateId,
                GlobalIdEntity.ProductComponentPricingTemplate,
                [...itemPrefix, "pricingTemplateId"],
                errors,
              )
            : item.pricingTemplateId,
          optionSelections: item.optionSelections?.map((selection, selectionIndex) => {
            const selectionPrefix = [
              ...itemPrefix,
              "optionSelections",
              String(selectionIndex),
            ];
            return {
              id: selection.id
                ? decodeInputId(
                    selection.id,
                    GlobalIdEntity.ProductComponentItemOptionSelection,
                    [...selectionPrefix, "id"],
                    errors,
                  )
                : undefined,
              optionId:
                decodeInputId(
                  selection.optionId,
                  GlobalIdEntity.Option,
                  [...selectionPrefix, "optionId"],
                  errors,
                ) ?? "",
              parentOptionId: selection.parentOptionId
                ? decodeInputId(
                    selection.parentOptionId,
                    GlobalIdEntity.Option,
                    [...selectionPrefix, "parentOptionId"],
                    errors,
                  )
                : selection.parentOptionId,
              sortIndex: selection.sortIndex,
              values: selection.values.map((value, valueIndex) => ({
                id: value.id
                  ? decodeInputId(
                      value.id,
                      GlobalIdEntity.ProductComponentItemOptionValueSelection,
                      [
                        ...selectionPrefix,
                        "values",
                        String(valueIndex),
                        "id",
                      ],
                      errors,
                    )
                  : undefined,
                optionValueId: value.optionValueId
                  ? decodeInputId(
                      value.optionValueId,
                      GlobalIdEntity.OptionValue,
                      [
                        ...selectionPrefix,
                        "values",
                        String(valueIndex),
                        "optionValueId",
                      ],
                      errors,
                    )
                  : value.optionValueId,
                value: value.value,
                status: value.status,
                sortIndex: value.sortIndex,
              })),
            };
          }),
          title: item.title,
          visible: item.visible,
          selected: item.selected,
          sortIndex: item.sortIndex,
        };
      }),
    };
  });
}

function mapProductComponentPriceRule(
  input: NonNullable<
    NonNullable<
      NonNullable<ProductComponentOperationInput["pricingTemplates"]>[number]
    >["priceRule"]
  >,
  fieldPrefix: string[],
  errors: UserError[],
) {
  return {
    id: input.id
      ? decodeInputId(
          input.id,
          GlobalIdEntity.ProductComponentPriceRule,
          [...fieldPrefix, "id"],
          errors,
        )
      : undefined,
    strategy: input.strategy,
    operation: input.operation,
    valueType: input.valueType,
    amounts: input.amounts?.map((amount) => ({
      currency: amount.currency,
      amountMinor: Number(amount.amountMinor),
    })),
    percentageBps: input.percentageBps,
  };
}

function mapProductComponentDependencyRules(
  rules: NonNullable<ProductComponentOperationInput["dependencyRules"]>,
  operationPrefix: string[],
  errors: UserError[],
) {
  return rules.map((rule, ruleIndex) => {
    const rulePrefix = [
      ...operationPrefix,
      "dependencyRules",
      String(ruleIndex),
    ];
    return {
      id: rule.id
        ? decodeInputId(
            rule.id,
            GlobalIdEntity.ProductComponentDependencyRule,
            [...rulePrefix, "id"],
            errors,
          )
        : undefined,
      name: rule.name,
      enabled: rule.enabled,
      priority: rule.priority,
      logicOperator: rule.logicOperator,
      conditionGroups: rule.conditionGroups.map((group, groupIndex) => {
        const groupPrefix = [
          ...rulePrefix,
          "conditionGroups",
          String(groupIndex),
        ];
        return {
          id: group.id
            ? decodeInputId(
                group.id,
                GlobalIdEntity.ProductComponentConditionGroup,
                [...groupPrefix, "id"],
                errors,
              )
            : undefined,
          logicOperator: group.logicOperator,
          sortIndex: group.sortIndex,
          conditions: group.conditions.map((condition, conditionIndex) => {
            const conditionPrefix = [
              ...groupPrefix,
              "conditions",
              String(conditionIndex),
            ];
            return {
              id: condition.id
                ? decodeInputId(
                    condition.id,
                    GlobalIdEntity.ProductComponentCondition,
                    [...conditionPrefix, "id"],
                    errors,
                  )
                : undefined,
              category: condition.category,
              subject: condition.subject,
              operator: condition.operator,
              targetType: condition.targetType,
              targetId:
                decodeProductComponentTargetId(
                  condition.targetId,
                  String(condition.targetType),
                  [...conditionPrefix, "targetId"],
                  errors,
                ) ?? "",
              value: condition.value,
              sortIndex: condition.sortIndex,
            };
          }),
        };
      }),
      actions: rule.actions.map((action, actionIndex) => {
        const actionPrefix = [...rulePrefix, "actions", String(actionIndex)];
        if (String(action.actionType) === "ADJUST_PRICE" && !action.priceRule) {
          errors.push({
            message: "Price rule is required for adjust price actions",
            field: [...actionPrefix, "priceRule"],
            code: "REQUIRED",
          });
        }
        return {
          id: action.id
            ? decodeInputId(
                action.id,
                GlobalIdEntity.ProductComponentDependencyAction,
                [...actionPrefix, "id"],
                errors,
              )
            : undefined,
          actionType: action.actionType,
          targetType: action.targetType,
          targetId:
            decodeProductComponentTargetId(
              action.targetId,
              String(action.targetType),
              [...actionPrefix, "targetId"],
              errors,
            ) ?? "",
          requiredValue: action.requiredValue,
          priceRule: action.priceRule
            ? mapProductComponentPriceRule(
                action.priceRule,
                [...actionPrefix, "priceRule"],
                errors,
              )
            : action.priceRule,
          stackable: action.stackable,
          sortIndex: action.sortIndex,
        };
      }),
    };
  });
}

function decodeProductComponentTargetId(
  value: string,
  targetType: string,
  field: string[],
  errors: UserError[],
): string | undefined {
  const entity =
    targetType === "ITEM"
      ? GlobalIdEntity.ProductComponentItem
      : targetType === "GROUP"
        ? GlobalIdEntity.ProductComponentGroup
        : GlobalIdEntity.ProductComponentConfiguration;
  return decodeInputId(value, entity, field, errors);
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

  const inventoryFieldPrefix = [...fieldPrefix, "inventory"];
  const hasWarehouseId = Boolean(input.inventory?.warehouseId);
  const hasOnHand = input.inventory?.onHand !== undefined && input.inventory.onHand !== null;
  if (input.inventory && hasWarehouseId !== hasOnHand) {
    errors.push({
      message: "warehouseId and onHand must be provided together",
      field: inventoryFieldPrefix,
      code: "REQUIRED_TOGETHER",
    });
  }
  const inventory = input.inventory
    ? {
        warehouseId: input.inventory.warehouseId
          ? decodeInputId(
              input.inventory.warehouseId,
              GlobalIdEntity.Warehouse,
              [...inventoryFieldPrefix, "warehouseId"],
              errors,
            )
          : undefined,
        onHand: input.inventory.onHand ?? undefined,
        unavailable: input.inventory.unavailable ?? undefined,
        sku: input.inventory.sku,
        trackInventory: input.inventory.trackInventory ?? undefined,
        requiresShipping: input.inventory.requiresShipping ?? undefined,
        continueSellingWhenOutOfStock:
          input.inventory.continueSellingWhenOutOfStock ?? undefined,
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

function mapProductOptionsSyncOperation(
  productId: string,
  options: NonNullable<ProductUpdateInput["options"]>,
  operationsFieldPrefix: string[],
): { entry: ProductUpdateMappedEntry } {
  const errors: UserError[] = [];
  const fieldPrefix = [...operationsFieldPrefix, "options"];
  const mappedOptions = options.map((option, optionIndex) => ({
    id: option.id
      ? decodeInputId(
          option.id,
          GlobalIdEntity.Option,
          [...fieldPrefix, String(optionIndex), "id"],
          errors,
        )
      : undefined,
    sortIndex: option.sortIndex,
    slug: option.slug,
    name: option.name,
    categoryId: decodeInputId(
      option.categoryId,
      GlobalIdEntity.OptionCategory,
      [...fieldPrefix, String(optionIndex), "categoryId"],
      errors,
    ) ?? "",
    values: option.values.map((value, valueIndex) => ({
      id: value.id
        ? decodeInputId(
            value.id,
            GlobalIdEntity.OptionValue,
            [...fieldPrefix, String(optionIndex), "values", String(valueIndex), "id"],
            errors,
          )
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
              ? decodeInputId(
                  value.swatch.fileId,
                  GlobalIdEntity.File,
                  [
                    ...fieldPrefix,
                    String(optionIndex),
                    "values",
                    String(valueIndex),
                    "swatch",
                    "fileId",
                  ],
                  errors,
                )
              : undefined,
            metadata: value.swatch.metadata,
          }
        : value.swatch,
    })),
  }));
  const operation = errors.length === 0
    ? ({
        type: "productOptionsSync",
        params: { productId, options: mappedOptions },
        meta: { fieldPrefix },
      } satisfies ProductUpdateOperation)
    : undefined;

  return {
    entry: { type: "productOptionsSync", operation, errors },
  };
}

function mapProductFeaturesSyncOperation(
  productId: string,
  features: NonNullable<ProductUpdateInput["features"]>,
  operationsFieldPrefix: string[],
): { entry: ProductUpdateMappedEntry } {
  const errors: UserError[] = [];
  const fieldPrefix = [...operationsFieldPrefix, "features"];
  const mappedFeatures = features.map((feature, featureIndex) => ({
    id: feature.id
      ? decodeInputId(
          feature.id,
          GlobalIdEntity.Feature,
          [...fieldPrefix, String(featureIndex), "id"],
          errors,
        )
      : undefined,
    index: feature.index,
    slug: feature.slug,
    isGroup: feature.isGroup,
    name: feature.name,
    values: feature.values?.map((value, valueIndex) => ({
      id: value.id
        ? decodeInputId(
            value.id,
            GlobalIdEntity.FeatureValue,
            [...fieldPrefix, String(featureIndex), "values", String(valueIndex), "id"],
            errors,
          )
        : undefined,
      index: value.index,
      slug: value.slug,
      name: value.name,
    })),
  }));
  const operation = errors.length === 0
    ? ({
        type: "productFeaturesSync",
        params: { productId, features: mappedFeatures },
        meta: { fieldPrefix },
      } satisfies ProductUpdateOperation)
    : undefined;

  return {
    entry: { type: "productFeaturesSync", operation, errors },
  };
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
      ? encodeGlobalIdByType(
          entry.entityId,
          operationResultEntityType(entry.type),
        )
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
  if (type === "productOptionsSync") {
    return "PRODUCT_OPTIONS_SYNC";
  }
  if (type === "productFeaturesSync") {
    return "PRODUCT_FEATURES_SYNC";
  }
  if (type === "productComponentSettingsUpdate") {
    return "PRODUCT_COMPONENT_SETTINGS_UPDATE";
  }
  if (type === "productComponentRemove") {
    return "PRODUCT_COMPONENT_REMOVE";
  }
  if (type === "productComponentConfigurationCreate") {
    return "PRODUCT_COMPONENT_CONFIGURATION_CREATE";
  }
  if (type === "productComponentConfigurationUpdate") {
    return "PRODUCT_COMPONENT_CONFIGURATION_UPDATE";
  }
  if (type === "productComponentConfigurationDelete") {
    return "PRODUCT_COMPONENT_CONFIGURATION_DELETE";
  }
  if (type === "productComponentGroupsSync") {
    return "PRODUCT_COMPONENT_GROUPS_SYNC";
  }
  if (type === "productComponentPricingTemplatesSync") {
    return "PRODUCT_COMPONENT_PRICING_TEMPLATES_SYNC";
  }
  if (type === "productComponentDependencyRulesSync") {
    return "PRODUCT_COMPONENT_DEPENDENCY_RULES_SYNC";
  }
  if (type === "variantCreate") {
    return "VARIANT_CREATE";
  }
  if (type === "variantDelete") {
    return "VARIANT_DELETE";
  }
  return "VARIANT_UPDATE";
}

function operationResultEntityType(
  type: ProductUpdateOperation["type"],
): GlobalIdType {
  if (
    type === "productComponentConfigurationCreate" ||
    type === "productComponentConfigurationUpdate" ||
    type === "productComponentConfigurationDelete" ||
    type === "productComponentGroupsSync" ||
    type === "productComponentPricingTemplatesSync" ||
    type === "productComponentDependencyRulesSync"
  ) {
    return GlobalIdEntity.ProductComponentConfiguration;
  }
  return GlobalIdEntity.Variant;
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
