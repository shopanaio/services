import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { ApolloMutation, ZodResolver } from "@shopana/type-resolver";
import {
  COLLECTION_LISTING_CONTRACT_VERSION,
  hashCanonicalCollectionRulesV1,
  hashCanonicalJsonV1,
  normalizeCanonicalCollectionRulesV1,
  type CanonicalCollectionRule,
  type PreviewCollectionRulesResult,
} from "@shopana/broker-types";
import type { CollectionUpdatedReason } from "@shopana/events";
import { CatalogType } from "./CatalogType.js";
import type { UserError } from "../../kernel/BaseScript.js";

/**
 * Safely decode a global ID, returning null if invalid
 */
function safeDecodeGlobalId(globalId: string, expectedType: GlobalIdType): string | null {
  try {
    return decodeGlobalIdByType(globalId, expectedType);
  } catch {
    return null;
  }
}

import type {
  CategoryFieldsParams,
  CategoryUpdateOperation,
  CategoryUpdateWorkflowInput,
  CategoryUpdateWorkflowResult,
  CategoryWorkflowContext,
} from "../../workflows/category-update/dto/CategoryUpdateWorkflowDto.js";
import type {
  CategoryCreateParams,
  CategoryCreateInput,
  CategoryCreateResult,
} from "../../workflows/category-create/dto/index.js";
import type {
  CategoryDeleteInput,
  CategoryDeleteResult,
} from "../../workflows/category-delete/dto/index.js";
import type {
  ProductUpdateWorkflowInput,
  ProductUpdateWorkflowResult,
  ProductUpdateOperation,
  ProductCategoryOperationAction,
  ProductTagOperationAction,
  WorkflowContext,
} from "../../workflows/product-update/dto/ProductUpdateWorkflowDto.js";
import {
  buildCategoryUpdateQueuePartitionKey,
  buildCatalogAggregateQueuePartitionKey,
  buildProductUpdateQueuePartitionKey,
  CATALOG_AGGREGATE_MUTATIONS_QUEUE,
} from "../../workflows/productUpdateWorkflowQueue.js";
import type { ProductCreateParams } from "../../workflows/product-create/dto/ProductCreateDto.js";
import type { ProductCreateWorkflowInput } from "../../workflows/product-create/dto/ProductCreateWorkflowInput.js";
import type { ProductDeleteWorkflowInput } from "../../workflows/product-delete/dto/ProductDeleteWorkflowInput.js";
import type {
  CollectionCreateWorkflowInput,
  CollectionCreateWorkflowResult,
} from "../../workflows/collection-create/dto/index.js";
import type {
  CollectionDeleteWorkflowInput,
  CollectionDeleteWorkflowResult,
} from "../../workflows/collection-delete/dto/index.js";
import type {
  CollectionOperationResult,
  CollectionUpdateOperation,
  CollectionUpdateWorkflowInput,
  CollectionUpdateWorkflowResult,
} from "../../workflows/collection-update/dto/index.js";
import type { CollectionRulesPreviewWorkflowInput } from "../../workflows/collection-rules-preview/dto/index.js";
import type { ProductBulkUpdateItem } from "../../workflows/product-bulk-edit/dto/BulkEditWorkflowDto.js";
import type {
  WarehouseUpdateInput,
  WarehouseUpdateOperation,
  WarehouseUpdateResult,
} from "../../workflows/warehouse-update/dto/index.js";
import type {
  WarehouseCreateInput,
  WarehouseCreateResult,
} from "../../workflows/warehouse-create/dto/index.js";
import type {
  WarehouseDeleteInput,
  WarehouseDeleteResult,
} from "../../workflows/warehouse-delete/dto/index.js";
import type {
  WarehouseBulkUpdateInput,
  WarehouseBulkUpdateResult,
} from "../../workflows/warehouse-bulk-update/dto/index.js";
import type {
  VendorCreateInput,
  VendorCreateResult,
} from "../../workflows/vendor-create/dto/index.js";
import type {
  VendorUpdateInput,
  VendorUpdateResult,
} from "../../workflows/vendor-update/dto/index.js";
import type {
  VendorDeleteInput,
  VendorDeleteResult,
} from "../../workflows/vendor-delete/dto/index.js";
import type { TagCreateInput, TagCreateResult } from "../../workflows/tag-create/dto/index.js";
import type { TagUpdateInput, TagUpdateResult } from "../../workflows/tag-update/dto/index.js";
import type { TagDeleteInput, TagDeleteResult } from "../../workflows/tag-delete/dto/index.js";
import type {
  ProductOptionCategoryCreateInput,
  ProductOptionCategoryCreateResult,
} from "../../workflows/product-option-category-create/dto/index.js";
import type {
  ProductOptionCategoryUpdateInput,
  ProductOptionCategoryUpdateResult,
} from "../../workflows/product-option-category-update/dto/index.js";
import type {
  ProductOptionCategoryDeleteInput,
  ProductOptionCategoryDeleteResult,
} from "../../workflows/product-option-category-delete/dto/index.js";
import type {
  ComparisonProfileCreateInput as ComparisonProfileCreateWorkflowInput,
  ComparisonProfileCreateResult,
} from "../../workflows/comparison-profile-create/dto/index.js";
import type {
  ComparisonProfileUpdateInput,
  ComparisonProfileUpdateResult,
} from "../../workflows/comparison-profile-update/dto/index.js";
import type {
  ComparisonProfileDeleteInput,
  ComparisonProfileDeleteResult,
} from "../../workflows/comparison-profile-delete/dto/index.js";
import type {
  ProductCreateInput,
  ProductBulkUpdateInput,
  ProductUpdateInput,
  ProductComparisonConfigurationOperationInput,
  CatalogMutationCategoryCreateArgs,
  CatalogMutationCategoryDeleteArgs,
  CatalogMutationCategoryUpdateArgs,
  CatalogMutationCollectionCreateArgs,
  CatalogMutationCollectionDeleteArgs,
  CatalogMutationCollectionRulesPreviewCountArgs,
  CatalogMutationCollectionUpdateArgs,
  CatalogMutationComparisonProfileCreateArgs,
  CatalogMutationComparisonProfileDeleteArgs,
  CatalogMutationComparisonProfileUpdateArgs,
  CatalogMutationProductDeleteArgs,
  CatalogMutationVendorCreateArgs,
  CatalogMutationVendorDeleteArgs,
  CatalogMutationVendorUpdateArgs,
  CatalogMutationProductOptionCategoryCreateArgs,
  CatalogMutationProductOptionCategoryDeleteArgs,
  CatalogMutationProductOptionCategoryUpdateArgs,
  CatalogMutationProductUpdateArgs,
  CatalogMutationTagCreateArgs,
  CatalogMutationTagDeleteArgs,
  CatalogMutationTagUpdateArgs,
  InventoryMutationWarehouseBulkUpdateArgs,
  InventoryMutationWarehouseCreateArgs,
  InventoryMutationWarehouseDeleteArgs,
  InventoryMutationWarehouseUpdateArgs,
  RichTextInput,
  CollectionCreateInput,
  CollectionRuleInput,
  CollectionUpdateInput,
  WarehouseUpdateInput as WarehouseUpdateGraphqlInput,
} from "./generated/types.js";
import {
  CategoryCreateInputSchema,
  VendorCreateInputSchema,
  ProductOptionCategoryCreateInputSchema,
  ProductCreateInputSchema,
  WarehouseCreateInputSchema,
} from "./generated/schemas.js";
import { ProductBulkUpdateInputSchema } from "./validation/productBulkEditSchema.js";
import type {
  ComparisonProfileCreateInput,
  ComparisonProfileDefinitionInput,
} from "./generated/types.js";
import { ComparisonProfileCreateInputSchema } from "./generated/schemas.js";

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
  @ZodResolver(ComparisonProfileCreateInputSchema())
  async comparisonProfileCreate(args: CatalogMutationComparisonProfileCreateArgs) {
    const decoded = decodeComparisonProfileInput(args.input);
    if (decoded.userErrors.length) return { profile: null, userErrors: decoded.userErrors };
    const input: ComparisonProfileCreateWorkflowInput = {
      definition: decoded.input!,
      context: this.mutationWorkflowContext(),
    };
    const result = (await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.comparisonProfileCreate",
      input,
      {
        source: "time-window",
        organizationId: input.context.organizationId,
        resourceId: input.context.storeId,
        operation: "comparisonProfileCreate",
        content: input.definition,
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      { adminContext: this.$ctx.adminContext },
    )) as ComparisonProfileCreateResult;
    return {
      profile: result.profile ? await this.resolvers.comparisonProfile(result.profile.id) : null,
      userErrors: result.userErrors,
    };
  }

  async comparisonProfileUpdate(args: CatalogMutationComparisonProfileUpdateArgs) {
    const id = safeDecodeGlobalId(args.comparisonProfileId, GlobalIdEntity.ComparisonProfile);
    if (!id) {
      return {
        profile: null,
        operationResults: [],
        userErrors: [invalidIdError("comparison profile", ["comparisonProfileId"])],
      };
    }
    if (!args.operations.definition) {
      return emptyUpdatePayload("comparison profile", ["operations"]);
    }
    const decoded = decodeComparisonProfileInput(args.operations.definition);
    if (decoded.userErrors.length) {
      return { profile: null, operationResults: [], userErrors: decoded.userErrors };
    }
    const input: ComparisonProfileUpdateInput = {
      comparisonProfileId: id,
      operations: [
        {
          type: "comparisonProfileDefinitionReplace",
          definition: decoded.input!,
          fieldPath: ["operations", "definition"],
        },
      ],
      context: this.mutationWorkflowContext(),
    };
    const result = (await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.comparisonProfileUpdate",
      input,
      {
        source: "time-window",
        organizationId: input.context.organizationId,
        resourceId: id,
        operation: "comparisonProfileUpdate",
        content: input.operations,
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      {
        adminContext: this.$ctx.adminContext,
        queueName: CATALOG_AGGREGATE_MUTATIONS_QUEUE,
        enqueueOptions: {
          queuePartitionKey: buildCatalogAggregateQueuePartitionKey({
            storeId: input.context.storeId,
            entityType: "comparisonProfile",
            entityId: id,
          }),
        },
      },
    )) as ComparisonProfileUpdateResult;
    return {
      profile: result.profile ? await this.resolvers.comparisonProfile(result.profile.id) : null,
      operationResults: mapOperationResults(
        result.operationResults,
        GlobalIdEntity.ComparisonProfile,
      ),
      userErrors: result.userErrors,
    };
  }

  async comparisonProfileDelete(args: CatalogMutationComparisonProfileDeleteArgs) {
    const id = safeDecodeGlobalId(args.comparisonProfileId, GlobalIdEntity.ComparisonProfile);
    if (!id)
      return {
        deletedComparisonProfileId: null,
        userErrors: [invalidIdError("comparison profile", ["comparisonProfileId"])],
      };
    const input: ComparisonProfileDeleteInput = {
      comparisonProfileId: id,
      context: this.mutationWorkflowContext(),
    };
    const result = (await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.comparisonProfileDelete",
      input,
      {
        source: "time-window",
        organizationId: input.context.organizationId,
        resourceId: id,
        operation: "comparisonProfileDelete",
        content: {},
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      {
        adminContext: this.$ctx.adminContext,
        queueName: CATALOG_AGGREGATE_MUTATIONS_QUEUE,
        enqueueOptions: {
          queuePartitionKey: buildCatalogAggregateQueuePartitionKey({
            storeId: input.context.storeId,
            entityType: "comparisonProfile",
            entityId: id,
          }),
        },
      },
    )) as ComparisonProfileDeleteResult;
    return {
      deletedComparisonProfileId: result.deletedComparisonProfileId
        ? encodeGlobalIdByType(result.deletedComparisonProfileId, GlobalIdEntity.ComparisonProfile)
        : null,
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(WarehouseCreateInputSchema())
  async warehouseCreate(args: InventoryMutationWarehouseCreateArgs) {
    const input: WarehouseCreateInput = {
      code: args.input.code,
      name: args.input.name,
      isDefault: args.input.isDefault ?? undefined,
      context: this.mutationWorkflowContext(),
    };
    const result = (await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.warehouseCreate",
      input,
      {
        source: "time-window",
        organizationId: input.context.organizationId,
        resourceId: input.context.storeId,
        operation: "warehouseCreate",
        content: { code: input.code, name: input.name, isDefault: input.isDefault },
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      { adminContext: this.$ctx.adminContext },
    )) as WarehouseCreateResult;
    return {
      warehouse: result.warehouse ? await this.resolvers.warehouse(result.warehouse.id) : null,
      userErrors: result.userErrors,
    };
  }

  async warehouseUpdate(args: InventoryMutationWarehouseUpdateArgs) {
    const warehouseId = safeDecodeGlobalId(args.warehouseId, GlobalIdEntity.Warehouse);
    if (!warehouseId) {
      return {
        warehouse: null,
        operationResults: [],
        userErrors: [invalidIdError("warehouse", ["warehouseId"])],
      };
    }
    const mapped = mapWarehouseUpdateOperations(warehouseId, args.operations);
    if (mapped.userErrors.length) {
      return { warehouse: null, operationResults: [], userErrors: mapped.userErrors };
    }
    const input: WarehouseUpdateInput = {
      warehouseId,
      operations: mapped.operations,
      context: this.mutationWorkflowContext(),
    };
    const result = (await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.warehouseUpdate",
      input,
      {
        source: "time-window",
        organizationId: input.context.organizationId,
        resourceId: warehouseId,
        operation: "warehouseUpdate",
        content: input.operations,
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      {
        adminContext: this.$ctx.adminContext,
        queueName: CATALOG_AGGREGATE_MUTATIONS_QUEUE,
        enqueueOptions: {
          queuePartitionKey: buildCatalogAggregateQueuePartitionKey({
            storeId: input.context.storeId,
            entityType: "warehouse",
            entityId: warehouseId,
          }),
        },
      },
    )) as WarehouseUpdateResult;
    return {
      warehouse: result.warehouse ? await this.resolvers.warehouse(result.warehouse.id) : null,
      operationResults: mapOperationResults(
        result.operationResults,
        GlobalIdEntity.Warehouse,
        GlobalIdEntity.WarehouseStock,
      ),
      userErrors: result.userErrors,
    };
  }

  async warehouseDelete(args: InventoryMutationWarehouseDeleteArgs) {
    const warehouseId = safeDecodeGlobalId(args.warehouseId, GlobalIdEntity.Warehouse);
    if (!warehouseId) {
      return {
        deletedWarehouseId: null,
        userErrors: [invalidIdError("warehouse", ["warehouseId"])],
      };
    }
    const input: WarehouseDeleteInput = { warehouseId, context: this.mutationWorkflowContext() };
    const result = (await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.warehouseDelete",
      input,
      {
        source: "time-window",
        organizationId: input.context.organizationId,
        resourceId: warehouseId,
        operation: "warehouseDelete",
        content: {},
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      {
        adminContext: this.$ctx.adminContext,
        queueName: CATALOG_AGGREGATE_MUTATIONS_QUEUE,
        enqueueOptions: {
          queuePartitionKey: buildCatalogAggregateQueuePartitionKey({
            storeId: input.context.storeId,
            entityType: "warehouse",
            entityId: warehouseId,
          }),
        },
      },
    )) as WarehouseDeleteResult;
    return {
      deletedWarehouseId: result.deletedWarehouseId
        ? encodeGlobalIdByType(result.deletedWarehouseId, GlobalIdEntity.Warehouse)
        : null,
      userErrors: result.userErrors,
    };
  }

  async warehouseBulkUpdate(args: InventoryMutationWarehouseBulkUpdateArgs) {
    if (args.input.warehouses.length === 0) {
      return { results: [], userErrors: [emptyOperationError(["input", "warehouses"])] };
    }
    if (args.input.warehouses.length > 100) {
      return {
        results: [],
        userErrors: [
          {
            message: "At most 100 warehouses can be updated",
            field: ["input", "warehouses"],
            code: "LIMIT_EXCEEDED",
          },
        ],
      };
    }

    const prepared: Array<{
      encodedId: string;
      warehouseId: string;
      operations: readonly WarehouseUpdateOperation[];
    }> = [];
    const userErrors: UserError[] = [];
    let operationCount = 0;
    for (const [index, item] of args.input.warehouses.entries()) {
      const warehouseId = safeDecodeGlobalId(item.warehouseId, GlobalIdEntity.Warehouse);
      if (!warehouseId) {
        userErrors.push(
          invalidIdError("warehouse", ["input", "warehouses", String(index), "warehouseId"]),
        );
        continue;
      }
      const mapped = mapWarehouseUpdateOperations(warehouseId, item.operations, [
        "input",
        "warehouses",
        String(index),
        "operations",
      ]);
      userErrors.push(...mapped.userErrors);
      operationCount += mapped.operations.length;
      prepared.push({ encodedId: item.warehouseId, warehouseId, operations: mapped.operations });
    }
    if (operationCount > 500) {
      userErrors.push({
        message: "At most 500 operations can be updated",
        field: ["input", "warehouses"],
        code: "LIMIT_EXCEEDED",
      });
    }
    if (userErrors.length) return { results: [], userErrors };

    const workflowInput: WarehouseBulkUpdateInput = {
      items: prepared.map((item) => ({
        warehouseId: item.warehouseId,
        operations: item.operations,
      })),
      context: this.mutationWorkflowContext(),
    };
    const coordinated = (await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.warehouseBulkUpdate",
      workflowInput,
      {
        source: "time-window",
        organizationId: workflowInput.context.organizationId,
        resourceId: workflowInput.context.storeId,
        operation: "warehouseBulkUpdate",
        content: { items: workflowInput.items },
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      { adminContext: this.$ctx.adminContext },
    )) as WarehouseBulkUpdateResult;
    return {
      results: await Promise.all(
        coordinated.results.map(async ({ result }, index) => ({
          warehouseId: prepared[index]!.encodedId,
          warehouse: result.warehouse ? await this.resolvers.warehouse(result.warehouse.id) : null,
          operationResults: mapOperationResults(
            result.operationResults,
            GlobalIdEntity.Warehouse,
            GlobalIdEntity.WarehouseStock,
          ),
          userErrors: result.userErrors,
        })),
      ),
      userErrors: [],
    };
  }

  private mutationWorkflowContext() {
    return {
      organizationId: this.$ctx.store.organizationId,
      storeId: this.$ctx.store.id,
      userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
      locale: this.$ctx.locale ?? this.$ctx.store.defaultLocale,
      requestId: this.$ctx.requestId,
    };
  }

  private categoryWorkflowContext(): CategoryWorkflowContext {
    return {
      organizationId: this.$ctx.store.organizationId,
      storeId: this.$ctx.store.id,
      userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
      locale: this.$ctx.locale ?? this.$ctx.store.defaultLocale,
      requestId: this.$ctx.requestId,
    };
  }

  private mapCategoryUpdateOperations(
    operations: CatalogMutationCategoryUpdateArgs["operations"],
  ): { operations: readonly CategoryUpdateOperation[]; userErrors: UserError[] } {
    const userErrors: UserError[] = [];
    const mapped: CategoryUpdateOperation[] = [];

    if (operations.fields) {
      const fields = operations.fields;
      const fileIds = decodeGlobalIdList(
        fields.media?.fileIds,
        GlobalIdEntity.File,
        ["operations", "fields", "media", "fileIds"],
        "media file",
        userErrors,
      );
      const ogImageId = fields.seo?.ogImageId
        ? safeDecodeGlobalId(fields.seo.ogImageId, GlobalIdEntity.File)
        : undefined;
      if (fields.seo?.ogImageId && !ogImageId) {
        userErrors.push({
          message: "Invalid Open Graph image ID",
          field: ["operations", "fields", "seo", "ogImageId"],
          code: "INVALID_ID",
        });
      }

      const params = {
        handle: fields.handle ?? undefined,
        name: fields.name ?? undefined,
        content:
          fields.content &&
          (fields.content.description !== undefined || fields.content.excerpt !== undefined)
            ? {
                description: mapRichTextInput(fields.content.description),
                excerpt: mapRichTextInput(fields.content.excerpt),
              }
            : undefined,
        seo:
          fields.seo === null
            ? null
            : fields.seo
              ? {
                  seoTitle: fields.seo.seoTitle ?? undefined,
                  seoDescription: fields.seo.seoDescription ?? undefined,
                  ogTitle: fields.seo.ogTitle ?? undefined,
                  ogDescription: fields.seo.ogDescription ?? undefined,
                  ogImageId,
                }
              : undefined,
        status:
          String(fields.status) === "PUBLISHED"
            ? ("published" as const)
            : String(fields.status) === "DRAFT"
              ? ("draft" as const)
              : undefined,
        media: fields.media ? { fileIds } : undefined,
        sort: fields.sort
          ? {
              defaultSort: String(fields.sort.defaultSort).toLowerCase() as
                "manual" | "price" | "newest" | "name",
              defaultSortDirection: fields.sort.defaultSortDirection as "asc" | "desc",
            }
          : undefined,
      };
      if (!hasCategoryFieldOperation(params)) {
        userErrors.push({
          message: "Category fields operation cannot be empty",
          field: ["operations", "fields"],
          code: "EMPTY_OPERATION",
        });
      } else {
        mapped.push({
          type: "categoryUpdate",
          params,
          meta: { fieldPrefix: ["operations", "fields"] },
        });
      }
    }

    if (operations.hierarchy) {
      if (operations.hierarchy.length === 0) {
        userErrors.push({
          message: "Category hierarchy operations cannot be empty",
          field: ["operations", "hierarchy"],
          code: "EMPTY_OPERATION",
        });
      }
      operations.hierarchy.forEach((operation, index) => {
        const fieldPrefix = ["operations", "hierarchy", String(index)];
        if (String(operation.action) === "MOVE") {
          const parentId = operation.parentId
            ? safeDecodeGlobalId(operation.parentId, GlobalIdEntity.Category)
            : null;
          if (operation.parentId && !parentId) {
            userErrors.push({
              message: "Invalid parent category ID",
              field: [...fieldPrefix, "parentId"],
              code: "INVALID_ID",
            });
          } else {
            mapped.push({
              type: "categoryHierarchyMove",
              params: { parentId },
              meta: { fieldPrefix },
            });
          }
        } else {
          if (operation.parentId != null) {
            userErrors.push({
              message: "REBALANCE does not accept parentId",
              field: [...fieldPrefix, "parentId"],
              code: "INVALID_INPUT",
            });
          }
          mapped.push({ type: "categoryHierarchyRebalance", params: {}, meta: { fieldPrefix } });
        }
      });
    }

    if (operations.comparisonProfile) {
      if (operations.comparisonProfile.length === 0) {
        userErrors.push({
          message: "Category comparison profile operations cannot be empty",
          field: ["operations", "comparisonProfile"],
          code: "EMPTY_OPERATION",
        });
      }
      operations.comparisonProfile.forEach((operation, index) => {
        const fieldPrefix = ["operations", "comparisonProfile", String(index)];
        const profileId = operation.profileId
          ? safeDecodeGlobalId(operation.profileId, GlobalIdEntity.ComparisonProfile)
          : null;
        if (operation.profileId && !profileId) {
          userErrors.push({
            message: "Invalid comparison profile ID",
            field: [...fieldPrefix, "profileId"],
            code: "INVALID_ID",
          });
        } else {
          mapped.push({
            type: "categoryComparisonProfileSet",
            params: { profileId },
            meta: { fieldPrefix },
          });
        }
      });
    }

    if (mapped.length === 0 && userErrors.length === 0) {
      userErrors.push({
        message: "At least one category operation is required",
        field: ["operations"],
        code: "EMPTY_OPERATION",
      });
    }
    return { operations: mapped, userErrors };
  }

  // ---- Vendor Mutations ----

  /**
   * Create a new vendor.
   */
  @ZodResolver(VendorCreateInputSchema())
  async vendorCreate(args: CatalogMutationVendorCreateArgs) {
    const input: VendorCreateInput = {
      name: args.input.name,
      context: this.mutationWorkflowContext(),
    };
    const result = (await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.vendorCreate",
      input,
      {
        source: "time-window",
        organizationId: input.context.organizationId,
        resourceId: input.context.storeId,
        operation: "vendorCreate",
        content: { name: input.name },
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      { adminContext: this.$ctx.adminContext },
    )) as VendorCreateResult;
    return {
      vendor: result.vendor ? await this.resolvers.vendor(result.vendor.id) : null,
      userErrors: result.userErrors,
    };
  }

  async vendorUpdate(args: CatalogMutationVendorUpdateArgs) {
    const id = safeDecodeGlobalId(args.vendorId, GlobalIdEntity.Vendor);
    if (!id) {
      return {
        vendor: null,
        operationResults: [],
        userErrors: [invalidIdError("vendor", ["vendorId"])],
      };
    }
    if (args.operations.name === undefined) return emptyUpdatePayload("vendor", ["operations"]);
    const input: VendorUpdateInput = {
      vendorId: id,
      operations: [
        {
          type: "vendorFieldsUpdate",
          name: args.operations.name,
          fieldPath: ["operations", "name"],
        },
      ],
      context: this.mutationWorkflowContext(),
    };
    const result = (await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.vendorUpdate",
      input,
      {
        source: "time-window",
        organizationId: input.context.organizationId,
        resourceId: id,
        operation: "vendorUpdate",
        content: input.operations,
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      {
        adminContext: this.$ctx.adminContext,
        queueName: CATALOG_AGGREGATE_MUTATIONS_QUEUE,
        enqueueOptions: {
          queuePartitionKey: buildCatalogAggregateQueuePartitionKey({
            storeId: input.context.storeId,
            entityType: "vendor",
            entityId: id,
          }),
        },
      },
    )) as VendorUpdateResult;
    return {
      vendor: result.vendor ? await this.resolvers.vendor(result.vendor.id) : null,
      operationResults: mapOperationResults(result.operationResults, GlobalIdEntity.Vendor),
      userErrors: result.userErrors,
    };
  }

  async vendorDelete(args: CatalogMutationVendorDeleteArgs) {
    const id = safeDecodeGlobalId(args.vendorId, GlobalIdEntity.Vendor);
    if (!id) {
      return { deletedVendorId: null, userErrors: [invalidIdError("vendor", ["vendorId"])] };
    }
    const input: VendorDeleteInput = { vendorId: id, context: this.mutationWorkflowContext() };
    const result = (await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.vendorDelete",
      input,
      {
        source: "time-window",
        organizationId: input.context.organizationId,
        resourceId: id,
        operation: "vendorDelete",
        content: {},
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      {
        adminContext: this.$ctx.adminContext,
        queueName: CATALOG_AGGREGATE_MUTATIONS_QUEUE,
        enqueueOptions: {
          queuePartitionKey: buildCatalogAggregateQueuePartitionKey({
            storeId: input.context.storeId,
            entityType: "vendor",
            entityId: id,
          }),
        },
      },
    )) as VendorDeleteResult;
    return {
      deletedVendorId: result.deletedVendorId
        ? encodeGlobalIdByType(result.deletedVendorId, GlobalIdEntity.Vendor)
        : null,
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(ProductOptionCategoryCreateInputSchema())
  async productOptionCategoryCreate(args: CatalogMutationProductOptionCategoryCreateArgs) {
    const input: ProductOptionCategoryCreateInput = {
      name: args.input.name,
      slug: args.input.slug,
      context: this.mutationWorkflowContext(),
    };
    const result = (await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.productOptionCategoryCreate",
      input,
      {
        source: "time-window",
        organizationId: input.context.organizationId,
        resourceId: input.context.storeId,
        operation: "productOptionCategoryCreate",
        content: { name: input.name, slug: input.slug },
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      { adminContext: this.$ctx.adminContext },
    )) as ProductOptionCategoryCreateResult;
    return {
      productOptionCategory: result.productOptionCategory
        ? await this.resolvers.optionCategory(result.productOptionCategory.id)
        : null,
      userErrors: result.userErrors,
    };
  }

  async productOptionCategoryUpdate(args: CatalogMutationProductOptionCategoryUpdateArgs) {
    const id = safeDecodeGlobalId(args.productOptionCategoryId, GlobalIdEntity.OptionCategory);
    if (!id) {
      return {
        productOptionCategory: null,
        operationResults: [],
        userErrors: [invalidIdError("product option category", ["productOptionCategoryId"])],
      };
    }
    if (args.operations.name === undefined && args.operations.slug === undefined) {
      return emptyUpdatePayload("product option category", ["operations"]);
    }
    const input: ProductOptionCategoryUpdateInput = {
      productOptionCategoryId: id,
      operations: [
        {
          type: "productOptionCategoryFieldsUpdate",
          name: args.operations.name ?? undefined,
          slug: args.operations.slug ?? undefined,
          fieldPath: ["operations"],
        },
      ],
      context: this.mutationWorkflowContext(),
    };
    const result = (await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.productOptionCategoryUpdate",
      input,
      {
        source: "time-window",
        organizationId: input.context.organizationId,
        resourceId: id,
        operation: "productOptionCategoryUpdate",
        content: input.operations,
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      {
        adminContext: this.$ctx.adminContext,
        queueName: CATALOG_AGGREGATE_MUTATIONS_QUEUE,
        enqueueOptions: {
          queuePartitionKey: buildCatalogAggregateQueuePartitionKey({
            storeId: input.context.storeId,
            entityType: "productOptionCategory",
            entityId: id,
          }),
        },
      },
    )) as ProductOptionCategoryUpdateResult;
    return {
      productOptionCategory: result.productOptionCategory
        ? await this.resolvers.optionCategory(result.productOptionCategory.id)
        : null,
      operationResults: mapOperationResults(result.operationResults, GlobalIdEntity.OptionCategory),
      userErrors: result.userErrors,
    };
  }

  async productOptionCategoryDelete(args: CatalogMutationProductOptionCategoryDeleteArgs) {
    const id = safeDecodeGlobalId(args.productOptionCategoryId, GlobalIdEntity.OptionCategory);
    if (!id) {
      return {
        deletedProductOptionCategoryId: null,
        userErrors: [invalidIdError("product option category", ["productOptionCategoryId"])],
      };
    }
    const input: ProductOptionCategoryDeleteInput = {
      productOptionCategoryId: id,
      context: this.mutationWorkflowContext(),
    };
    const result = (await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.productOptionCategoryDelete",
      input,
      {
        source: "time-window",
        organizationId: input.context.organizationId,
        resourceId: id,
        operation: "productOptionCategoryDelete",
        content: {},
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      {
        adminContext: this.$ctx.adminContext,
        queueName: CATALOG_AGGREGATE_MUTATIONS_QUEUE,
        enqueueOptions: {
          queuePartitionKey: buildCatalogAggregateQueuePartitionKey({
            storeId: input.context.storeId,
            entityType: "productOptionCategory",
            entityId: id,
          }),
        },
      },
    )) as ProductOptionCategoryDeleteResult;
    return {
      deletedProductOptionCategoryId: result.deletedProductOptionCategoryId
        ? encodeGlobalIdByType(result.deletedProductOptionCategoryId, GlobalIdEntity.OptionCategory)
        : null,
      userErrors: result.userErrors,
    };
  }

  // ---- Product Mutations ----

  /** Create a new product through the durable aggregate lifecycle workflow. */
  @ZodResolver(ProductCreateInputSchema())
  async productCreate(args: { input: ProductCreateInput }) {
    const { input } = args;

    // Decode Global IDs to UUIDs for media files
    const mediaFileIds = input.mediaFileIds?.map((fileId) =>
      decodeGlobalIdByType(fileId, GlobalIdEntity.File),
    );
    const vendorId = input.vendorId
      ? decodeGlobalIdByType(input.vendorId, GlobalIdEntity.Vendor)
      : undefined;

    const params: ProductCreateParams = {
      title: input.title,
      handle: input.handle,
      vendorId,
      description: mapRichTextInput(input.description),
      excerpt: mapRichTextInput(input.excerpt),
      mediaFileIds,
      options: input.options?.map((opt) => ({
        name: opt.name,
        slug: opt.slug,
        categoryId: decodeGlobalIdByType(opt.categoryId, GlobalIdEntity.OptionCategory),
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
            continueSellingWhenOutOfStock:
              input.inventoryItem.continueSellingWhenOutOfStock ?? undefined,
            requiresShipping: input.inventoryItem.requiresShipping,
          }
        : undefined,
      organizationId: this.$ctx.store.organizationId,
      storeId: this.$ctx.store.id,
      userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
    };

    const workflowInput: ProductCreateWorkflowInput = {
      params,
      context: this.categoryWorkflowContext(),
    };
    const result = await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.productCreate",
      workflowInput,
      {
        source: "time-window",
        organizationId: params.organizationId,
        resourceId: params.handle,
        operation: "productCreate",
        content: productCreateSemanticContent(params),
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      { adminContext: this.$ctx.adminContext },
    );

    return {
      product: result.product ? await this.resolvers.product(result.product.id) : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Delete a product.
   */
  async productDelete(args: CatalogMutationProductDeleteArgs) {
    const productId = safeDecodeGlobalId(args.productId, GlobalIdEntity.Product);
    if (!productId) {
      return {
        deletedProductId: null,
        userErrors: [invalidIdError("product", ["productId"])],
      };
    }

    const workflowInput: ProductDeleteWorkflowInput = {
      productId,
      permanent: args.permanent ?? false,
      context: this.categoryWorkflowContext(),
    };
    const result = await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.productDelete",
      workflowInput,
      {
        source: "time-window",
        organizationId: workflowInput.context.organizationId,
        resourceId: productId,
        operation: "productDelete",
        content: { permanent: workflowInput.permanent },
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      {
        adminContext: this.$ctx.adminContext,
        queueName: CATALOG_AGGREGATE_MUTATIONS_QUEUE,
        enqueueOptions: {
          queuePartitionKey: buildProductUpdateQueuePartitionKey({
            storeId: workflowInput.context.storeId,
            productId,
          }),
        },
      },
    );

    return {
      deletedProductId: result.deletedProductId
        ? encodeGlobalIdByType(result.deletedProductId, GlobalIdEntity.Product)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Unified product update.
   * Supports product, category, tag, and variant operations in a single request.
   */
  async productUpdate(args: CatalogMutationProductUpdateArgs) {
    const { productId, operations } = args;
    const decodedProductId = safeDecodeGlobalId(productId, GlobalIdEntity.Product);
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
      operations: mapped.operations,
      context: {
        organizationId: this.$ctx.store.organizationId,
        storeId: this.$ctx.store.id,
        userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
        locale: this.$ctx.locale ?? this.$ctx.store.defaultLocale,
        requestId: this.$ctx.requestId,
      },
    };

    const result = (await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.productUpdate",
      workflowInput,
      {
        source: "time-window",
        organizationId: this.$ctx.store.organizationId,
        resourceId: decodedProductId,
        operation: "productUpdate",
        content: workflowInput.operations,
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      {
        adminContext: this.$ctx.adminContext,
        queueName: CATALOG_AGGREGATE_MUTATIONS_QUEUE,
        enqueueOptions: {
          queuePartitionKey: buildProductUpdateQueuePartitionKey({
            storeId: this.$ctx.store.id,
            productId: decodedProductId,
          }),
        },
      },
    )) as ProductUpdateWorkflowResult;

    return {
      product: result.product ? await this.resolvers.product(result.product.id) : null,
      operationResults: result.operationResults.map((r) => ({
        type: toGraphqlOperationType(r.type),
        applied: r.applied,
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
        const decoded = safeDecodeGlobalId(input.mediaFileIds[index], GlobalIdEntity.File);
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

    const params: CategoryCreateParams = {
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
    };
    const workflowInput: CategoryCreateInput = {
      params,
      context: this.categoryWorkflowContext(),
    };
    const result = (await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.categoryCreate",
      workflowInput,
      {
        source: "time-window",
        organizationId: this.$ctx.store.organizationId,
        resourceId: this.$ctx.store.id,
        operation: "categoryCreate",
        content: params,
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      { adminContext: this.$ctx.adminContext },
    )) as CategoryCreateResult;

    return {
      category: result.category ? await this.resolvers.category(result.category.id) : null,
      userErrors: result.userErrors,
    };
  }

  async categoryUpdate(args: CatalogMutationCategoryUpdateArgs) {
    let categoryId: string;
    try {
      categoryId = decodeGlobalIdByType(args.categoryId, GlobalIdEntity.Category);
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
    if (mapped.userErrors.length > 0) {
      return {
        category: null,
        operationResults: [],
        userErrors: mapped.userErrors,
      };
    }

    const workflowInput: CategoryUpdateWorkflowInput = {
      categoryId,
      operations: mapped.operations,
      context: this.categoryWorkflowContext(),
    };

    const result = (await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.categoryUpdate",
      workflowInput,
      {
        source: "time-window",
        organizationId: this.$ctx.store.organizationId,
        resourceId: categoryId,
        operation: "categoryUpdate",
        content: {
          locale: workflowInput.context.locale,
          operations: workflowInput.operations,
        },
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      {
        adminContext: this.$ctx.adminContext,
        queueName: CATALOG_AGGREGATE_MUTATIONS_QUEUE,
        enqueueOptions: {
          queuePartitionKey: buildCategoryUpdateQueuePartitionKey({
            storeId: this.$ctx.store.id,
            categoryId,
          }),
        },
      },
    )) as CategoryUpdateWorkflowResult;

    return {
      category: result.category ? await this.resolvers.category(result.category.id) : null,
      operationResults: result.operationResults.map((item) => ({
        type: toGraphqlCategoryOperationType(item.type),
        applied: item.applied,
        entityId: item.entityId
          ? encodeGlobalIdByType(item.entityId, GlobalIdEntity.ComparisonProfile)
          : null,
        errors: item.errors,
      })),
      userErrors: result.userErrors,
    };
  }

  /**
   * Delete a category.
   */
  async categoryDelete(args: CatalogMutationCategoryDeleteArgs) {
    let categoryId: string;
    try {
      categoryId = decodeGlobalIdByType(args.categoryId, GlobalIdEntity.Category);
    } catch {
      return {
        deletedCategoryId: null,
        userErrors: [{ message: "Invalid ID format", code: "INVALID_ID" }],
      };
    }

    const workflowInput: CategoryDeleteInput = {
      categoryId,
      permanent: args.permanent ?? false,
      context: this.categoryWorkflowContext(),
    };
    const result = (await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.categoryDelete",
      workflowInput,
      {
        source: "time-window",
        organizationId: this.$ctx.store.organizationId,
        resourceId: categoryId,
        operation: "categoryDelete",
        content: { permanent: workflowInput.permanent },
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      {
        adminContext: this.$ctx.adminContext,
        queueName: CATALOG_AGGREGATE_MUTATIONS_QUEUE,
        enqueueOptions: {
          queuePartitionKey: buildCategoryUpdateQueuePartitionKey({
            storeId: this.$ctx.store.id,
            categoryId,
          }),
        },
      },
    )) as CategoryDeleteResult;

    return {
      deletedCategoryId: result.deletedCategoryId
        ? encodeGlobalIdByType(result.deletedCategoryId, GlobalIdEntity.Category)
        : null,
      userErrors: result.userErrors,
    };
  }

  async collectionCreate(args: CatalogMutationCollectionCreateArgs) {
    const mapped = mapCollectionCreateInput(args.input);
    if (mapped.userErrors.length > 0) return { collection: null, userErrors: mapped.userErrors };
    const input: CollectionCreateWorkflowInput = {
      params: mapped.params!,
      context: this.collectionWorkflowContext(),
    };
    const result = (await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.collectionCreate",
      input,
      {
        source: "time-window",
        organizationId: input.context.organizationId,
        resourceId: `${input.context.storeId}:collection:${input.params.handle}`,
        operation: "collectionCreate",
        content: input.params,
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      { adminContext: this.$ctx.adminContext },
    )) as CollectionCreateWorkflowResult;
    return {
      collection: result.collection ? await this.resolvers.collection(result.collection.id) : null,
      userErrors: result.userErrors,
    };
  }

  async collectionUpdate(args: CatalogMutationCollectionUpdateArgs) {
    const collectionId = safeDecodeGlobalId(args.collectionId, GlobalIdEntity.Collection);
    if (!collectionId) {
      return {
        collection: null,
        operationResults: [],
        userErrors: [invalidIdError("collection", ["collectionId"])],
      };
    }
    const mapped = await mapCollectionUpdateInput(collectionId, args.operations, (rules) =>
      this.normalizeCollectionRules(rules),
    );
    if (mapped.userErrors.length > 0) {
      return { collection: null, operationResults: [], userErrors: mapped.userErrors };
    }
    const input: CollectionUpdateWorkflowInput = {
      collectionId,
      operations: mapped.operations,
      context: this.collectionWorkflowContext(),
    };
    const result = (await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.collectionUpdate",
      input,
      {
        source: "time-window",
        organizationId: input.context.organizationId,
        resourceId: collectionId,
        operation: "collectionUpdate",
        content: input.operations,
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      {
        adminContext: this.$ctx.adminContext,
        queueName: CATALOG_AGGREGATE_MUTATIONS_QUEUE,
        enqueueOptions: {
          queuePartitionKey: buildCatalogAggregateQueuePartitionKey({
            storeId: input.context.storeId,
            entityType: "collection",
            entityId: collectionId,
          }),
        },
      },
    )) as CollectionUpdateWorkflowResult;
    return {
      collection: result.collection ? await this.resolvers.collection(result.collection.id) : null,
      operationResults: result.operationResults.map(mapCollectionOperationResult),
      userErrors: result.userErrors,
    };
  }

  async collectionDelete(args: CatalogMutationCollectionDeleteArgs) {
    const collectionId = safeDecodeGlobalId(args.collectionId, GlobalIdEntity.Collection);
    if (!collectionId) {
      return {
        deletedCollectionId: null,
        userErrors: [invalidIdError("collection", ["collectionId"])],
      };
    }
    const input: CollectionDeleteWorkflowInput = {
      collectionId,
      context: this.collectionWorkflowContext(),
    };
    const result = (await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.collectionDelete",
      input,
      {
        source: "time-window",
        organizationId: input.context.organizationId,
        resourceId: collectionId,
        operation: "collectionDelete",
        content: {},
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      {
        adminContext: this.$ctx.adminContext,
        queueName: CATALOG_AGGREGATE_MUTATIONS_QUEUE,
        enqueueOptions: {
          queuePartitionKey: buildCatalogAggregateQueuePartitionKey({
            storeId: input.context.storeId,
            entityType: "collection",
            entityId: collectionId,
          }),
        },
      },
    )) as CollectionDeleteWorkflowResult;
    return {
      deletedCollectionId: result.deletedCollectionId
        ? encodeGlobalIdByType(result.deletedCollectionId, GlobalIdEntity.Collection)
        : null,
      userErrors: result.userErrors,
    };
  }

  async collectionRulesPreviewCount(args: CatalogMutationCollectionRulesPreviewCountArgs) {
    const normalized = await this.normalizeCollectionRules(args.input.rules);
    if (normalized.userErrors.length > 0) {
      return {
        count: null,
        rulesHash: null,
        indexObservedAt: null,
        userErrors: normalized.userErrors,
      };
    }
    const rulesHash = hashCanonicalCollectionRulesV1(normalized.rules);
    const workflowInput: CollectionRulesPreviewWorkflowInput = {
      organizationId: this.$ctx.store.organizationId,
      storeId: this.$ctx.store.id,
      params: {
        contractVersion: COLLECTION_LISTING_CONTRACT_VERSION,
        storeId: this.$ctx.store.id,
        rules: normalized.rules,
        rulesHash,
      },
    };
    let result: PreviewCollectionRulesResult;
    try {
      result = await this.$ctx.kernel
        .getServices()
        .broker.runWorkflow<PreviewCollectionRulesResult, CollectionRulesPreviewWorkflowInput>(
          "catalog.collectionRulesPreview",
          workflowInput,
          {
            source: "content",
            organizationId: this.$ctx.store.organizationId,
            resourceId: this.$ctx.store.id,
            operation: "catalog.collectionRulesPreview",
            contentHash: hashCanonicalJsonV1({ rulesHash }),
          },
          {
            adminContext: this.$ctx.adminContext,
          },
        );
    } catch {
      return {
        count: null,
        rulesHash,
        indexObservedAt: null,
        userErrors: [
          {
            message: "Collection rule preview is temporarily unavailable",
            code: "COLLECTION_PREVIEW_UNAVAILABLE",
          },
        ],
      };
    }
    if (!result.ok) {
      return {
        count: null,
        rulesHash,
        indexObservedAt: null,
        userErrors: [
          {
            message: result.message,
            field: result.field,
            code: result.code,
          },
        ],
      };
    }
    return {
      count: result.count,
      rulesHash: result.rulesHash,
      indexObservedAt: result.indexObservedAt,
      userErrors: [],
    };
  }

  private collectionWorkflowContext() {
    return {
      storeId: this.$ctx.store.id,
      organizationId: this.$ctx.store.organizationId,
      requestId: this.$ctx.requestId,
      userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
      locale: this.$ctx.locale ?? this.$ctx.store.defaultLocale,
      currency: this.$ctx.currency ?? this.$ctx.store.currencyCode,
      defaultLocale: this.$ctx.store.defaultLocale,
      defaultCurrency: this.$ctx.store.currencyCode,
      locales: [...this.$ctx.store.locales],
      currencies: [this.$ctx.store.currencyCode],
    };
  }

  private async normalizeCollectionRules(
    inputs: readonly CollectionRuleInput[],
  ): Promise<{ rules: CanonicalCollectionRule[]; userErrors: UserError[] }> {
    const prepared: unknown[] = [];
    try {
      for (const [index, input] of inputs.entries()) {
        const branches = [
          ["category", input.category],
          ["tag", input.tag],
          ["vendor", input.vendor],
          ["feature", input.feature],
          ["option", input.option],
          ["priceComparison", input.priceComparison],
          ["priceRange", input.priceRange],
          ["inStock", input.inStock],
          ["createdAtComparison", input.createdAtComparison],
          ["createdAtRange", input.createdAtRange],
        ] as const;
        const selected = branches.filter(([, value]) => value != null);
        if (selected.length !== 1) {
          return {
            rules: [],
            userErrors: [
              {
                message: "Exactly one typed rule field must be provided",
                field: ["input", "rules", String(index)],
                code: "INVALID_RULE",
              },
            ],
          };
        }

        if (input.category) {
          prepared.push({
            field: "category",
            operator: input.category.operator.toLowerCase(),
            value: {
              ids: input.category.categoryIds.map((id) =>
                decodeGlobalIdByType(id, GlobalIdEntity.Category),
              ),
            },
          });
          continue;
        }
        if (input.tag) {
          prepared.push({
            field: "tag",
            operator: input.tag.operator.toLowerCase(),
            value: {
              ids: input.tag.tagIds.map((id) => decodeGlobalIdByType(id, GlobalIdEntity.Tag)),
            },
          });
          continue;
        }
        if (input.vendor) {
          prepared.push({
            field: "vendor",
            operator: "in",
            value: {
              ids: input.vendor.vendorIds.map((id) =>
                decodeGlobalIdByType(id, GlobalIdEntity.Vendor),
              ),
            },
          });
          continue;
        }
        if (input.feature) {
          prepared.push({
            field: "feature",
            operator: input.feature.operator.toLowerCase(),
            value: {
              values: input.feature.values.map((item) => ({
                sourceHandle: item.sourceHandle,
                valueHandle: item.valueHandle,
              })),
            },
          });
          continue;
        }
        if (input.option) {
          prepared.push({
            field: "option",
            operator: input.option.operator.toLowerCase(),
            value: {
              values: input.option.values.map((item) => ({
                sourceHandle: item.sourceHandle,
                valueHandle: item.valueHandle,
              })),
            },
          });
          continue;
        }
        if (input.priceComparison) {
          prepared.push({
            field: "price",
            operator: input.priceComparison.operator.toLowerCase(),
            value: {
              currencyCode: input.priceComparison.currencyCode,
              amountMinor: input.priceComparison.amountMinor,
            },
          });
          continue;
        }
        if (input.priceRange) {
          prepared.push({
            field: "price",
            operator: "between",
            value: {
              currencyCode: input.priceRange.currencyCode,
              minAmountMinor: input.priceRange.minAmountMinor,
              maxAmountMinor: input.priceRange.maxAmountMinor,
            },
          });
          continue;
        }
        if (input.inStock) {
          prepared.push({
            field: "in_stock",
            operator: "eq",
            value: { value: input.inStock.value },
          });
          continue;
        }
        if (input.createdAtComparison) {
          prepared.push({
            field: "created_at",
            operator: input.createdAtComparison.operator.toLowerCase(),
            value: { instant: input.createdAtComparison.instant },
          });
          continue;
        }
        if (!input.createdAtRange) {
          throw new Error("Typed collection rule branch was not resolved");
        }
        prepared.push({
          field: "created_at",
          operator: "between",
          value: {
            from: input.createdAtRange.from,
            to: input.createdAtRange.to,
          },
        });
      }
      const rules = normalizeCanonicalCollectionRulesV1(prepared);
      return { rules, userErrors: [] };
    } catch (error) {
      return {
        rules: [],
        userErrors: [
          {
            message: error instanceof Error ? error.message : "Invalid collection rule",
            field: ["rules"],
            code: "INVALID_RULE",
          },
        ],
      };
    }
  }

  // ---- Tag Mutations ----

  async tagCreate(args: CatalogMutationTagCreateArgs) {
    const input: TagCreateInput = {
      handle: args.input.handle,
      name: args.input.name ?? undefined,
      context: this.mutationWorkflowContext(),
    };
    const result = (await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.tagCreate",
      input,
      {
        source: "time-window",
        organizationId: input.context.organizationId,
        resourceId: input.context.storeId,
        operation: "tagCreate",
        content: { handle: input.handle, name: input.name },
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      { adminContext: this.$ctx.adminContext },
    )) as TagCreateResult;
    return {
      tag: result.tag ? await this.resolvers.tag(result.tag.id) : null,
      userErrors: result.userErrors,
    };
  }

  async tagUpdate(args: CatalogMutationTagUpdateArgs) {
    const id = safeDecodeGlobalId(args.tagId, GlobalIdEntity.Tag);
    if (!id) {
      return {
        tag: null,
        operationResults: [],
        userErrors: [invalidIdError("tag", ["tagId"])],
      };
    }
    if (args.operations.handle === undefined && args.operations.name === undefined) {
      return emptyUpdatePayload("tag", ["operations"]);
    }
    const input: TagUpdateInput = {
      tagId: id,
      operations: [
        {
          type: "tagFieldsUpdate",
          handle: args.operations.handle ?? undefined,
          name: args.operations.name ?? undefined,
          fieldPath: ["operations"],
        },
      ],
      context: this.mutationWorkflowContext(),
    };
    const result = (await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.tagUpdate",
      input,
      {
        source: "time-window",
        organizationId: input.context.organizationId,
        resourceId: id,
        operation: "tagUpdate",
        content: input.operations,
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      {
        adminContext: this.$ctx.adminContext,
        queueName: CATALOG_AGGREGATE_MUTATIONS_QUEUE,
        enqueueOptions: {
          queuePartitionKey: buildCatalogAggregateQueuePartitionKey({
            storeId: input.context.storeId,
            entityType: "tag",
            entityId: id,
          }),
        },
      },
    )) as TagUpdateResult;
    return {
      tag: result.tag ? await this.resolvers.tag(result.tag.id) : null,
      operationResults: mapOperationResults(result.operationResults, GlobalIdEntity.Tag),
      userErrors: result.userErrors,
    };
  }

  async tagDelete(args: CatalogMutationTagDeleteArgs) {
    const id = safeDecodeGlobalId(args.tagId, GlobalIdEntity.Tag);
    if (!id) {
      return { deletedTagId: null, userErrors: [invalidIdError("tag", ["tagId"])] };
    }
    const input: TagDeleteInput = { tagId: id, context: this.mutationWorkflowContext() };
    const result = (await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.tagDelete",
      input,
      {
        source: "time-window",
        organizationId: input.context.organizationId,
        resourceId: id,
        operation: "tagDelete",
        content: {},
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      {
        adminContext: this.$ctx.adminContext,
        queueName: CATALOG_AGGREGATE_MUTATIONS_QUEUE,
        enqueueOptions: {
          queuePartitionKey: buildCatalogAggregateQueuePartitionKey({
            storeId: input.context.storeId,
            entityType: "tag",
            entityId: id,
          }),
        },
      },
    )) as TagDeleteResult;
    return {
      deletedTagId: result.deletedTagId
        ? encodeGlobalIdByType(result.deletedTagId, GlobalIdEntity.Tag)
        : null,
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
      requestId: this.$ctx.requestId,
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
      const decodedProductId = safeDecodeGlobalId(item.productId, GlobalIdEntity.Product);
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
        productIndex: index,
      });
      if (mapped.operations.length === 0 && mapped.errors.length === 0) {
        inputErrors.push({
          message: "At least one product operation is required",
          field: ["input", "products", String(index), "operations"],
          code: "EMPTY_OPERATION",
          productId: item.productId,
        });
      }
      inputErrors.push(...mapped.errors);
      products.push({
        productId: decodedProductId,
        operations: mapped.operations,
      });
    }

    if (products.reduce((total, product) => total + product.operations.length, 0) > 500) {
      inputErrors.push({
        message: "Total operations exceed limit of 500",
        field: ["input", "products"],
        code: "LIMIT_EXCEEDED",
      });
    }

    if (inputErrors.length > 0) {
      return {
        job: null,
        userErrors: inputErrors,
      };
    }

    const result = (await this.$ctx.kernel.getServices().broker.runWorkflow(
      "catalog.productBulkEdit",
      { products, context },
      {
        source: "time-window",
        organizationId: context.organizationId,
        resourceId: context.storeId,
        operation: "productBulkEdit",
        content: { products },
        requestTimestamp: this.$ctx.requestTimestamp,
        windowMs: 5_000,
      },
      { adminContext: this.$ctx.adminContext },
    )) as { jobId: string };

    return {
      job: result.jobId ? await this.resolvers.productBulkUpdateJob(result.jobId) : null,
      userErrors: [],
    };
  }
}

export class InventoryMutationResolver extends CatalogMutationResolver {}

// ─── Helpers ──────────────────────────────────────────────────

function invalidIdError(label: string, field: string[]): UserError {
  return { message: `Invalid ${label} ID`, field, code: "INVALID_ID" };
}

function emptyOperationError(field: string[]): UserError {
  return { message: "At least one operation is required", field, code: "EMPTY_OPERATION" };
}

function requiredOperationField(name: string, prefix: string[]): UserError {
  return {
    message: `${name} is required for this action`,
    field: [...prefix, name],
    code: "REQUIRED",
  };
}

function emptyUpdatePayload(label: string, field: string[]) {
  const error: UserError = {
    message: `At least one ${label} operation is required`,
    field,
    code: "EMPTY_OPERATION",
  };
  return { operationResults: [], userErrors: [error] };
}

function mapOperationResults(
  results: readonly Readonly<{
    type: string;
    applied: boolean;
    entityId?: string;
    errors: readonly UserError[];
  }>[],
  aggregateEntityType: GlobalIdType,
  ownedEntityType?: GlobalIdType,
) {
  return results.map((result) => ({
    type: operationGraphqlType(result.type),
    applied: result.applied,
    entityId: result.entityId
      ? encodeGlobalIdByType(
          result.entityId,
          (result.type === "warehouseStockCreate" || result.type === "warehouseStockDelete") &&
            ownedEntityType
            ? ownedEntityType
            : aggregateEntityType,
        )
      : null,
    errors: result.errors,
  }));
}

function operationGraphqlType(type: string) {
  switch (type) {
    case "warehouseFieldsUpdate":
      return "WAREHOUSE_UPDATE";
    case "warehouseStockCreate":
      return "WAREHOUSE_STOCK_CREATE";
    case "warehouseStockDelete":
      return "WAREHOUSE_STOCK_DELETE";
    case "vendorFieldsUpdate":
      return "VENDOR_UPDATE";
    case "productOptionCategoryFieldsUpdate":
      return "PRODUCT_OPTION_CATEGORY_UPDATE";
    case "tagFieldsUpdate":
      return "TAG_UPDATE";
    case "comparisonProfileDefinitionReplace":
      return "COMPARISON_PROFILE_UPDATE";
  }
}

function mapWarehouseUpdateOperations(
  _warehouseId: string,
  input: WarehouseUpdateGraphqlInput,
  prefix: string[] = ["operations"],
): { operations: readonly WarehouseUpdateOperation[]; userErrors: UserError[] } {
  const operations: WarehouseUpdateOperation[] = [];
  const userErrors: UserError[] = [];
  if (input.code !== undefined || input.name !== undefined || input.isDefault !== undefined) {
    operations.push({
      type: "warehouseFieldsUpdate",
      code: input.code ?? undefined,
      name: input.name ?? undefined,
      isDefault: input.isDefault ?? undefined,
      meta: { fieldPrefix: prefix },
    });
  }
  if (input.stock) {
    if (input.stock.length === 0) userErrors.push(emptyOperationError([...prefix, "stock"]));
    for (const [index, item] of input.stock.entries()) {
      const fieldPrefix = [...prefix, "stock", String(index)];
      const variantId = safeDecodeGlobalId(item.variantId, GlobalIdEntity.Variant);
      if (!variantId) {
        userErrors.push(invalidIdError("variant", [...fieldPrefix, "variantId"]));
        continue;
      }
      const type =
        String(item.action) === "CREATE" ? "warehouseStockCreate" : "warehouseStockDelete";
      operations.push({
        type,
        variantId,
        meta: { fieldPrefix },
      });
    }
  }
  if (operations.length === 0 && userErrors.length === 0)
    userErrors.push(emptyOperationError(prefix));
  return { operations, userErrors };
}

function mapCollectionCreateInput(input: CollectionCreateInput) {
  const userErrors: UserError[] = [];
  const mediaFileIds = decodeGlobalIdList(
    input.media?.map((item) => item.fileId),
    GlobalIdEntity.File,
    ["input", "media"],
    "media file",
    userErrors,
  );
  const ogImageId = input.seo?.ogImageId
    ? safeDecodeGlobalId(input.seo.ogImageId, GlobalIdEntity.File)
    : undefined;
  if (input.seo?.ogImageId && !ogImageId) {
    userErrors.push(invalidIdError("Open Graph image", ["input", "seo", "ogImageId"]));
  }
  return {
    params: userErrors.length
      ? undefined
      : {
          handle: input.handle,
          type: String(input.type).toLowerCase() as "manual" | "rule",
          name: input.name,
          description: mapRichTextInput(input.description),
          excerpt: mapRichTextInput(input.excerpt),
          mediaFileIds: input.media ? mediaFileIds : undefined,
          seo: input.seo
            ? {
                seoTitle: input.seo.seoTitle ?? undefined,
                seoDescription: input.seo.seoDescription ?? undefined,
                ogTitle: input.seo.ogTitle ?? undefined,
                ogDescription: input.seo.ogDescription ?? undefined,
                ogImageId,
              }
            : undefined,
          defaultSort: input.defaultSort?.toLowerCase() as
            "manual" | "price" | "newest" | "name" | undefined,
          defaultSortDirection: input.defaultSortDirection ?? undefined,
          activeFrom: input.activeFrom,
          activeTo: input.activeTo,
          publish: input.publish ?? undefined,
        },
    userErrors,
  };
}

async function mapCollectionUpdateInput(
  collectionId: string,
  input: CollectionUpdateInput,
  normalizeRules: (
    rules: readonly CollectionRuleInput[],
  ) => Promise<{ rules: CanonicalCollectionRule[]; userErrors: UserError[] }>,
): Promise<{ operations: readonly CollectionUpdateOperation[]; userErrors: UserError[] }> {
  const operations: CollectionUpdateOperation[] = [];
  const userErrors: UserError[] = [];
  if (input.fields) {
    const fields = input.fields;
    if (!hasCollectionFieldsOperation(fields)) {
      userErrors.push(emptyOperationError(["operations", "fields"]));
    }
    const mediaFileIds = decodeGlobalIdList(
      fields.media?.map((item) => item.fileId),
      GlobalIdEntity.File,
      ["operations", "fields", "media"],
      "media file",
      userErrors,
    );
    const ogImageId = fields.seo?.ogImageId
      ? safeDecodeGlobalId(fields.seo.ogImageId, GlobalIdEntity.File)
      : undefined;
    if (fields.seo?.ogImageId && !ogImageId)
      userErrors.push(
        invalidIdError("Open Graph image", ["operations", "fields", "seo", "ogImageId"]),
      );
    if (hasCollectionFieldsOperation(fields))
      operations.push({
        type: "collectionFieldsUpdate",
        params: {
          id: collectionId,
          handle: fields.handle ?? undefined,
          name: fields.name ?? undefined,
          description: mapRichTextInput(fields.description),
          excerpt: mapRichTextInput(fields.excerpt),
          mediaFileIds: fields.media ? mediaFileIds : undefined,
          seo:
            fields.seo === null
              ? null
              : fields.seo
                ? {
                    seoTitle: fields.seo.seoTitle ?? undefined,
                    seoDescription: fields.seo.seoDescription ?? undefined,
                    ogTitle: fields.seo.ogTitle ?? undefined,
                    ogDescription: fields.seo.ogDescription ?? undefined,
                    ogImageId,
                  }
                : undefined,
          defaultSort: fields.defaultSort?.toLowerCase() as
            "manual" | "price" | "newest" | "name" | undefined,
          defaultSortDirection: fields.defaultSortDirection ?? undefined,
          activeFrom: fields.activeFrom,
          activeTo: fields.activeTo,
          publish: fields.publish ?? undefined,
        },
        meta: {
          fieldPrefix: ["operations", "fields"],
          reasons: collectionFieldsUpdateReasons(fields),
        },
      });
  }
  if (input.products) {
    if (input.products.length === 0)
      userErrors.push(emptyOperationError(["operations", "products"]));
    for (const [index, item] of input.products.entries()) {
      const prefix = ["operations", "products", String(index)];
      const productId = item.productId
        ? safeDecodeGlobalId(item.productId, GlobalIdEntity.Product)
        : undefined;
      const afterProductId = item.afterProductId
        ? safeDecodeGlobalId(item.afterProductId, GlobalIdEntity.Product)
        : undefined;
      const beforeProductId = item.beforeProductId
        ? safeDecodeGlobalId(item.beforeProductId, GlobalIdEntity.Product)
        : undefined;
      if (item.productId && !productId)
        userErrors.push(invalidIdError("product", [...prefix, "productId"]));
      if (item.afterProductId && !afterProductId)
        userErrors.push(invalidIdError("product", [...prefix, "afterProductId"]));
      if (item.beforeProductId && !beforeProductId)
        userErrors.push(invalidIdError("product", [...prefix, "beforeProductId"]));
      const action = String(item.action);
      if ((action === "ADD" || action === "REMOVE" || action === "MOVE") && !productId) {
        userErrors.push(requiredOperationField("productId", prefix));
        continue;
      }
      if (action === "ADD")
        operations.push({
          type: "collectionProductAdd",
          params: { collectionId, productIds: [productId!] },
          meta: { fieldPrefix: prefix },
        });
      else if (action === "REMOVE")
        operations.push({
          type: "collectionProductRemove",
          params: { collectionId, productIds: [productId!] },
          meta: { fieldPrefix: prefix },
        });
      else if (action === "MOVE")
        operations.push({
          type: "collectionProductMove",
          params: { collectionId, productId: productId!, afterProductId, beforeProductId },
          meta: { fieldPrefix: prefix },
        });
      else if (action === "CLEAR")
        operations.push({
          type: "collectionProductClear",
          params: { collectionId },
          meta: { fieldPrefix: prefix },
        });
      else if (action === "REBALANCE")
        operations.push({
          type: "collectionProductRebalance",
          params: { collectionId },
          meta: { fieldPrefix: prefix },
        });
    }
  }
  if (input.rules) {
    if (input.rules.length === 0) userErrors.push(emptyOperationError(["operations", "rules"]));
    for (const [index, item] of input.rules.entries()) {
      const prefix = ["operations", "rules", String(index)];
      const normalized = await normalizeRules(item.rules);
      userErrors.push(
        ...normalized.userErrors.map((error) => ({
          ...error,
          field: error.field ? [...prefix, ...error.field.slice(2)] : prefix,
        })),
      );
      if (normalized.userErrors.length === 0)
        operations.push({
          type: "collectionRulesReplace",
          params: { collectionId, rules: normalized.rules },
          meta: { fieldPrefix: prefix },
        });
    }
  }
  if (operations.length === 0 && userErrors.length === 0)
    userErrors.push(emptyOperationError(["operations"]));
  return { operations, userErrors };
}

function hasCollectionFieldsOperation(
  fields: NonNullable<CollectionUpdateInput["fields"]>,
): boolean {
  return [
    "handle",
    "name",
    "description",
    "excerpt",
    "media",
    "seo",
    "defaultSort",
    "defaultSortDirection",
    "activeFrom",
    "activeTo",
    "publish",
  ].some((field) => Object.prototype.hasOwnProperty.call(fields, field));
}

function collectionFieldsUpdateReasons(
  fields: NonNullable<CollectionUpdateInput["fields"]>,
): CollectionUpdatedReason[] {
  const reasons: CollectionUpdatedReason[] = [];
  const has = (field: keyof typeof fields) => Object.prototype.hasOwnProperty.call(fields, field);

  if (
    has("handle") ||
    has("name") ||
    has("description") ||
    has("excerpt") ||
    has("media") ||
    has("seo")
  ) {
    reasons.push("metadata");
  }
  if (has("defaultSort") || has("defaultSortDirection")) reasons.push("sort");
  if (has("activeFrom") || has("activeTo")) reasons.push("schedule");
  if (has("publish")) reasons.push("publication");

  return reasons.length > 0 ? reasons : ["metadata"];
}

function mapCollectionOperationResult(result: CollectionOperationResult) {
  const type = {
    collectionFieldsUpdate: "COLLECTION_FIELDS_UPDATE",
    collectionProductAdd: "COLLECTION_PRODUCT_ADD",
    collectionProductRemove: "COLLECTION_PRODUCT_REMOVE",
    collectionProductMove: "COLLECTION_PRODUCT_MOVE",
    collectionProductClear: "COLLECTION_PRODUCT_CLEAR",
    collectionProductRebalance: "COLLECTION_PRODUCT_REBALANCE",
    collectionRulesReplace: "COLLECTION_RULES_REPLACE",
  }[result.type];
  const entityType = collectionResultEntityType(result.type);
  return {
    type,
    applied: result.applied,
    entityId: result.entityId ? encodeGlobalIdByType(result.entityId, entityType) : null,
    errors: result.errors,
  };
}

function collectionResultEntityType(type: CollectionOperationResult["type"]): GlobalIdType {
  switch (type) {
    case "collectionProductAdd":
    case "collectionProductRemove":
    case "collectionProductMove":
      return GlobalIdEntity.Product;
    case "collectionFieldsUpdate":
    case "collectionProductClear":
    case "collectionProductRebalance":
    case "collectionRulesReplace":
      return GlobalIdEntity.Collection;
  }
}

function mapRichTextInput(input?: RichTextInput | null): RichTextInput | null | undefined {
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

function hasCategoryFieldOperation(fields: CategoryFieldsParams): boolean {
  return (
    fields.handle !== undefined ||
    fields.name !== undefined ||
    fields.content !== undefined ||
    fields.seo !== undefined ||
    fields.status !== undefined ||
    fields.media !== undefined ||
    fields.sort !== undefined
  );
}

function decodeGlobalIdList(
  values: readonly string[] | null | undefined,
  entityType: GlobalIdType,
  fieldPrefix: readonly string[],
  label: string,
  errors: UserError[],
): string[] {
  const decoded: string[] = [];
  for (const [index, value] of (values ?? []).entries()) {
    const id = safeDecodeGlobalId(value, entityType);
    if (id) decoded.push(id);
    else
      errors.push({
        message: `Invalid ${label} ID`,
        field: [...fieldPrefix, String(index)],
        code: "INVALID_ID",
      });
  }
  return decoded;
}

function toGraphqlCategoryOperationType(type: CategoryUpdateOperation["type"]) {
  switch (type) {
    case "categoryUpdate":
      return "CATEGORY_UPDATE";
    case "categoryHierarchyMove":
      return "CATEGORY_HIERARCHY_MOVE";
    case "categoryHierarchyRebalance":
      return "CATEGORY_HIERARCHY_REBALANCE";
    case "categoryComparisonProfileSet":
      return "CATEGORY_COMPARISON_PROFILE_SET";
  }
}

interface ProductUpdateInputMappingArgs {
  productId: string;
  operations?: ProductUpdateInput | null;
  productIndex?: number;
}

interface ProductUpdateMappedEntry {
  type: ProductUpdateOperation["type"];
  operation?: ProductUpdateOperation;
  errors: UserError[];
  entityId?: string;
}

interface ProductUpdateInputMappingResult {
  operations: readonly ProductUpdateOperation[];
  entries: ProductUpdateMappedEntry[];
  errors: UserError[];
}

function mapProductUpdateInput(
  args: ProductUpdateInputMappingArgs,
): ProductUpdateInputMappingResult {
  const { productId, operations, productIndex } = args;
  const result: ProductUpdateOperation[] = [];
  const entries: ProductUpdateMappedEntry[] = [];
  const errors: UserError[] = [];
  const variants = operations?.variants;
  const categories = operations?.categories;
  const tags = operations?.tags;
  const options = operations?.options;
  const features = operations?.features;
  const components = operations?.components;
  const comparisonConfiguration = operations?.comparisonConfiguration;
  const operationsFieldPrefix =
    productIndex === undefined
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
    const mapped = mapProductCategoryOperations(productId, categories, productIndex);
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
    const mapped = mapProductOptionsSyncOperation(productId, options, operationsFieldPrefix);
    entries.push(mapped.entry);
    errors.push(...mapped.entry.errors);
    if (mapped.entry.operation) result.push(mapped.entry.operation);
  }

  if (features) {
    const mapped = mapProductFeaturesSyncOperation(productId, features, operationsFieldPrefix);
    entries.push(mapped.entry);
    errors.push(...mapped.entry.errors);
    if (mapped.entry.operation) result.push(mapped.entry.operation);
  }

  if (components) {
    for (const [componentIndex, input] of components.entries()) {
      const fieldPrefix = [...operationsFieldPrefix, "components", String(componentIndex)];
      const entry = mapProductComponentOperationInput(productId, input, fieldPrefix);
      entries.push(entry);
      errors.push(...entry.errors);
      if (entry.operation) result.push(entry.operation);
    }
  }

  if (variants) {
    for (const [variantIndex, input] of variants.entries()) {
      const fieldPrefix = [...operationsFieldPrefix, "variants", String(variantIndex)];
      const entry = mapVariantOperationInput(productId, input, fieldPrefix);
      entries.push(entry);
      errors.push(...entry.errors);
      if (entry.operation) {
        result.push(entry.operation);
      }
    }
  }

  if (comparisonConfiguration) {
    if (comparisonConfiguration.length === 0) {
      errors.push(emptyOperationError([...operationsFieldPrefix, "comparisonConfiguration"]));
    }
    for (const [configurationIndex, input] of comparisonConfiguration.entries()) {
      const fieldPrefix = [
        ...operationsFieldPrefix,
        "comparisonConfiguration",
        String(configurationIndex),
      ];
      const entry = mapProductComparisonConfigurationOperation(productId, input, fieldPrefix);
      entries.push(entry);
      errors.push(...entry.errors);
      if (entry.operation) result.push(entry.operation);
    }
  }

  // Option-definition replacement and variant option mutations are one dependent
  // aggregate change. They cannot be safely split into independent durable steps.
  const optionDefinitionEntry = entries.find(
    (entry) => entry.operation?.type === "productOptionsSync",
  );
  const conflictingVariantEntries = entries.filter(
    (entry) =>
      entry.operation?.type === "variantCreate" ||
      (entry.operation?.type === "variantUpdate" && entry.operation.params.options !== undefined),
  );
  if (optionDefinitionEntry && conflictingVariantEntries.length > 0) {
    const conflict = (entry: ProductUpdateMappedEntry) => {
      const error: UserError = {
        message:
          "Option definition sync cannot be combined with variant option or create operations",
        field: entry.operation?.meta?.fieldPrefix,
        code: "DEPENDENT_OPERATION_CONFLICT",
      };
      entry.errors.push(error);
      errors.push(error);
      if (entry.operation) {
        const operationIndex = result.indexOf(entry.operation);
        if (operationIndex >= 0) result.splice(operationIndex, 1);
        entry.operation = undefined;
      }
    };
    conflict(optionDefinitionEntry);
    conflictingVariantEntries.forEach(conflict);
  }

  // Multiple mutations of the same existing variant make the operation result
  // ordering and transactional boundary ambiguous, so reject them at preflight.
  const seenVariantIds = new Map<string, ProductUpdateMappedEntry>();
  for (const entry of entries) {
    const operation = entry.operation;
    if (!operation || (operation.type !== "variantUpdate" && operation.type !== "variantDelete"))
      continue;
    const variantId = operation.params.variantId;
    const previous = seenVariantIds.get(variantId);
    if (!previous) {
      seenVariantIds.set(variantId, entry);
      continue;
    }
    for (const duplicate of [previous, entry]) {
      const error: UserError = {
        message: "A variant can be updated only once in a product update request",
        field: duplicate.operation?.meta?.fieldPrefix,
        code: "DUPLICATE_VARIANT_OPERATION",
      };
      duplicate.errors.push(error);
      errors.push(error);
      if (duplicate.operation) {
        const operationIndex = result.indexOf(duplicate.operation);
        if (operationIndex >= 0) result.splice(operationIndex, 1);
        duplicate.operation = undefined;
      }
    }
  }

  const immutableOperations: readonly ProductUpdateOperation[] = result.map(
    (operation, operationIndex) => ({
      ...operation,
      meta: { ...operation.meta, operationIndex },
    }),
  );

  return { operations: immutableOperations, entries, errors };
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

type ProductComponentOperationInput = NonNullable<ProductUpdateInput["components"]>[number];

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
  const forbid = (allowed: Array<keyof ProductComponentOperationInput>): void => {
    const allowedSet = new Set<keyof ProductComponentOperationInput>(["action", ...allowed]);
    for (const key of [
      "configurationId",
      "displayStyle",
      "name",
      "groups",
      "pricingTemplates",
      "dependencyRules",
    ] as Array<keyof ProductComponentOperationInput>) {
      if (!allowedSet.has(key) && input[key] !== undefined && input[key] !== null) {
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
      forbid(["name"]);
      if (!name) {
        errors.push({
          message: "Configuration name is required",
          field: [...fieldPrefix, "name"],
          code: "REQUIRED",
        });
      }
      const operation =
        errors.length === 0 && name
          ? ({
              type: "productComponentConfigurationCreate",
              params: { productId, name },
              meta: { fieldPrefix },
            } satisfies ProductUpdateOperation)
          : undefined;
      return {
        type: "productComponentConfigurationCreate",
        operation,
        errors,
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
        ? mapProductComponentDependencyRules(input.dependencyRules, fieldPrefix, errors)
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
        ? decodeInputId(group.id, GlobalIdEntity.ProductComponentGroup, [...prefix, "id"], errors)
        : undefined,
      title: group.title,
      minSelection: group.minSelection,
      maxSelection: group.maxSelection,
      sortIndex: group.sortIndex,
      items: group.items.map((item, itemIndex) => {
        const itemPrefix = [...prefix, "items", String(itemIndex)];
        const priceRule = item.priceRule
          ? mapProductComponentPriceRule(item.priceRule, [...itemPrefix, "priceRule"], errors)
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
        if (String(item.itemType) === "VARIANT" && item.optionSelections != null) {
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
            const selectionPrefix = [...itemPrefix, "optionSelections", String(selectionIndex)];
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
                      [...selectionPrefix, "values", String(valueIndex), "id"],
                      errors,
                    )
                  : undefined,
                optionValueId: value.optionValueId
                  ? decodeInputId(
                      value.optionValueId,
                      GlobalIdEntity.OptionValue,
                      [...selectionPrefix, "values", String(valueIndex), "optionValueId"],
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
    const rulePrefix = [...operationPrefix, "dependencyRules", String(ruleIndex)];
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
        const groupPrefix = [...rulePrefix, "conditionGroups", String(groupIndex)];
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
            const conditionPrefix = [...groupPrefix, "conditions", String(conditionIndex)];
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
            ? mapProductComponentPriceRule(action.priceRule, [...actionPrefix, "priceRule"], errors)
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
  const variantId = input.variantId
    ? decodeInputId(input.variantId, GlobalIdEntity.Variant, [...fieldPrefix, "variantId"], errors)
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
      if (!input.options) {
        errors.push({
          message: "Options are required for variant create operations",
          field: [...fieldPrefix, "options"],
          code: "REQUIRED",
        });
      }

      const params = mapVariantPayloadParams(input, fieldPrefix, errors);
      const operation =
        errors.length === 0 && params.options
          ? ({
              type: "variantCreate",
              params: {
                productId,
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
              [...fieldPrefix, "options", "set", String(index), "optionValueId"],
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
        continueSellingWhenOutOfStock: input.inventory.continueSellingWhenOutOfStock ?? undefined,
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

  const weight = Object.prototype.hasOwnProperty.call(input, "weight") ? input.weight : undefined;

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
    categoryId:
      decodeInputId(
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
  const operation =
    errors.length === 0
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
    featured: feature.featured ?? false,
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
  const operation =
    errors.length === 0
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
  return values.map(
    (value, index) =>
      decodeInputId(value, expectedType, [...fieldPrefix, String(index)], errors) ?? "",
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
    entityId: entry.entityId
      ? encodeGlobalIdByType(entry.entityId, operationResultEntityType(entry.type))
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
        : ["input", "products", String(productIndex), "operations", "categories", String(index)];

    const categoryId = safeDecodeGlobalId(input.categoryId, GlobalIdEntity.Category);
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
        : ["input", "products", String(productIndex), "operations", "tags", String(index)];

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
  if (type === "productComparisonConfigurationSync") {
    return "PRODUCT_COMPARISON_CONFIGURATION_SYNC";
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

function operationResultEntityType(type: ProductUpdateOperation["type"]): GlobalIdType {
  if (type === "productComparisonConfigurationSync") {
    return GlobalIdEntity.Product;
  }
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

function decodeComparisonProfileInput(
  input: ComparisonProfileCreateInput | ComparisonProfileUpdateInput,
): { input?: any; userErrors: UserError[] } {
  const userErrors: UserError[] = [];
  const groups = input.groups.map((group, gi) => {
    const encodedGroupId = "id" in group ? group.id : undefined;
    const groupId = encodedGroupId
      ? safeDecodeGlobalId(encodedGroupId, GlobalIdEntity.ComparisonGroup)
      : undefined;
    if (encodedGroupId && !groupId)
      userErrors.push({
        message: "Invalid comparison group ID",
        field: ["groups", String(gi), "id"],
        code: "INVALID_ID",
      });
    return {
      ...group,
      id: groupId,
      fields: group.fields.map((field, fi) => {
        const encodedFieldId = "id" in field ? field.id : undefined;
        const fieldId = encodedFieldId
          ? safeDecodeGlobalId(encodedFieldId, GlobalIdEntity.ComparisonField)
          : undefined;
        if (encodedFieldId && !fieldId)
          userErrors.push({
            message: "Invalid comparison field ID",
            field: ["groups", String(gi), "fields", String(fi), "id"],
            code: "INVALID_ID",
          });
        return {
          ...field,
          id: fieldId,
          description: field.description ?? null,
          canonicalUnit: field.canonicalUnit ?? null,
          options: field.options.map((option, oi) => {
            const encodedOptionId = "id" in option ? option.id : undefined;
            const optionId = encodedOptionId
              ? safeDecodeGlobalId(encodedOptionId, GlobalIdEntity.ComparisonFieldOption)
              : undefined;
            if (encodedOptionId && !optionId)
              userErrors.push({
                message: "Invalid comparison field option ID",
                field: ["groups", String(gi), "fields", String(fi), "options", String(oi), "id"],
                code: "INVALID_ID",
              });
            return { ...option, id: optionId };
          }),
        };
      }),
    };
  });
  return {
    input: {
      handle: input.handle,
      enabled: input.enabled ?? true,
      name: input.name,
      missingLabel: input.missingLabel,
      notApplicableLabel: input.notApplicableLabel,
      unavailableLabel: input.unavailableLabel,
      groups,
    },
    userErrors,
  };
}

function mapProductComparisonConfigurationOperation(
  productId: string,
  input: ProductComparisonConfigurationOperationInput,
  fieldPrefix: string[],
): ProductUpdateMappedEntry {
  const userErrors: UserError[] = [];
  const profileId = safeDecodeGlobalId(input.profileId, GlobalIdEntity.ComparisonProfile);
  if (!profileId)
    userErrors.push({
      message: "Invalid comparison profile ID",
      field: [...fieldPrefix, "profileId"],
      code: "INVALID_ID",
    });
  const mappings = input.mappings.map((mapping, index) => {
    const mappingPrefix = [...fieldPrefix, "mappings", String(index)];
    const fieldId = safeDecodeGlobalId(mapping.fieldId, GlobalIdEntity.ComparisonField);
    if (!fieldId)
      userErrors.push({
        message: "Invalid comparison field ID",
        field: [...mappingPrefix, "fieldId"],
        code: "INVALID_ID",
      });
    const feature = mapping.feature
      ? {
          featureId: safeDecodeGlobalId(mapping.feature.featureId, GlobalIdEntity.Feature),
          values: mapping.feature.values.map((value, vi) => ({
            valueId: safeDecodeGlobalId(value.valueId, GlobalIdEntity.FeatureValue),
            normalized: decodeNormalized(
              value.value,
              [...mappingPrefix, "feature", "values", String(vi)],
              userErrors,
            ),
          })),
        }
      : undefined;
    const option = mapping.option
      ? {
          optionId: safeDecodeGlobalId(mapping.option.optionId, GlobalIdEntity.Option),
          values: mapping.option.values.map((value, vi) => ({
            valueId: safeDecodeGlobalId(value.valueId, GlobalIdEntity.OptionValue),
            normalized: decodeNormalized(
              value.value,
              [...mappingPrefix, "option", "values", String(vi)],
              userErrors,
            ),
          })),
        }
      : undefined;
    if (feature && (!feature.featureId || feature.values.some((value) => !value.valueId)))
      userErrors.push({
        message: "Invalid feature ID",
        field: [...mappingPrefix, "feature"],
        code: "INVALID_ID",
      });
    if (option && (!option.optionId || option.values.some((value) => !value.valueId)))
      userErrors.push({
        message: "Invalid option ID",
        field: [...mappingPrefix, "option"],
        code: "INVALID_ID",
      });
    return {
      fieldId: fieldId!,
      feature: feature
        ? {
            ...feature,
            featureId: feature.featureId!,
            values: feature.values.map((value) => ({ ...value, valueId: value.valueId! })),
          }
        : undefined,
      option: option
        ? {
            ...option,
            optionId: option.optionId!,
            values: option.values.map((value) => ({ ...value, valueId: value.valueId! })),
          }
        : undefined,
      notApplicable: mapping.notApplicable
        ? { reason: mapping.notApplicable.reason ?? null }
        : undefined,
    };
  });
  const operation: ProductUpdateOperation | undefined =
    userErrors.length === 0 && profileId
      ? {
          type: "productComparisonConfigurationSync",
          params: {
            productId,
            profileId,
            mappings,
          },
          meta: { fieldPrefix },
        }
      : undefined;
  return {
    type: "productComparisonConfigurationSync",
    operation,
    errors: userErrors,
    entityId: productId,
  };
}

function decodeNormalized(value: any, path: string[], userErrors: UserError[]) {
  const fieldOptionId = value.fieldOptionId
    ? safeDecodeGlobalId(value.fieldOptionId, GlobalIdEntity.ComparisonFieldOption)
    : null;
  if (value.fieldOptionId && !fieldOptionId)
    userErrors.push({
      message: "Invalid comparison field option ID",
      field: [...path, "value", "fieldOptionId"],
      code: "INVALID_ID",
    });
  return {
    booleanValue: value.booleanValue ?? null,
    decimalValue: value.decimalValue ?? null,
    integerValue: value.integerValue ?? null,
    textValue: value.textValue ?? null,
    fieldOptionId,
  };
}
