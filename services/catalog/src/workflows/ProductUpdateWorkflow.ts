import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  Workflow,
  WorkflowStep,
  InjectBroker,
  ServiceBroker,
  DBOS,
} from "@shopana/shared-kernel";
import { and, eq, sql } from "drizzle-orm";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import { product } from "../repositories/models/index.js";
import type {
  ProductUpdateWorkflowInput,
  ProductUpdateWorkflowResult,
  ProductUpdateParams,
  ProductCategoryUpdateParams,
  ProductTagUpdateParams,
  VariantCreateParams,
  VariantUpdateParams,
  VariantDeleteParams,
  OperationResult,
  WorkflowContext,
  ProductUpdateOperation,
} from "./dto/ProductUpdateWorkflowDto.js";
import type {
  ProductChanges,
  VariantChanges,
} from "../scripts/types/ProductChanges.js";
import type { UserError } from "../scripts/types/ScriptResult.js";

import type { Inventory } from "@shopana/broker-types";
import { ProductUpdateScript } from "../scripts/product/ProductUpdateScript.js";
import { ProductUpdateContentScript } from "../scripts/product/ProductUpdateContentScript.js";
import { ProductUpdateSeoScript } from "../scripts/product/ProductUpdateSeoScript.js";
import { ProductUpdateStatusScript } from "../scripts/product/ProductUpdateStatusScript.js";
import { ProductUpdateMediaScript } from "../scripts/product/ProductUpdateMediaScript.js";
import {
  CategoryAddProductScript,
  CategoryMoveProductScript,
  CategoryRemoveProductScript,
  CategorySetProductPrimaryScript,
} from "../scripts/category/index.js";
import {
  ProductTagAddScript,
  ProductTagRemoveScript,
} from "../scripts/tag/index.js";
import { VariantUpdatePricingScript } from "../scripts/variant/VariantUpdatePricingScript.js";
import { VariantUpdateMediaScript } from "../scripts/variant/VariantUpdateMediaScript.js";
import { VariantCreateScript } from "../scripts/variant/VariantCreateScript.js";
import { VariantDeleteScript } from "../scripts/variant/VariantDeleteScript.js";
import {
  VariantBatchUpdateOptionsScript,
  type VariantOptionsUpdate,
} from "../scripts/variant/VariantBatchUpdateOptionsScript.js";
import { InventoryItemUpdateScript } from "../scripts/inventory-item/InventoryItemUpdateScript.js";
import type { BackRefNotifyInput } from "../sagas/index.js";

type VariantWorkflowOperation = Extract<
  ProductUpdateOperation,
  { type: "variantCreate" | "variantUpdate" | "variantDelete" }
>;

interface VariantBatchValidationResult {
  valid: boolean;
  errorsByOperationIndex: Record<number, UserError[]>;
  userErrors: UserError[];
}

const SUPPORTED_CURRENCIES = new Set(["UAH", "USD", "EUR"]);

/**
 * ProductUpdateWorkflow for Catalog Service.
 * Handles atomic product updates with:
 * - Optimistic locking via revision field
 * - Partial failure support (each operation independent)
 * - Event emission with partial snapshot of changes
 * - Product category assignment operations for bulk and single updates
 *
 * Inventory entity operations are delegated to Inventory. Physical measurements
 * are exposed as variant-level operations because they are keyed by variantId.
 */
@Injectable()
export class ProductUpdateWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("catalog") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  /**
   * Convert WorkflowContext to RunScriptContext for kernel.runScript()
   */
  private toScriptContext(ctx: WorkflowContext): RunScriptContext {
    return {
      storeId: ctx.storeId,
      organizationId: ctx.organizationId,
      locale: ctx.locale,
      userId: ctx.userId,
    };
  }

  @Workflow("productUpdate")
  async run(
    input: ProductUpdateWorkflowInput,
  ): Promise<ProductUpdateWorkflowResult> {
    const results: OperationResult[] = [];
    const changes: ProductChanges = { productId: input.productId };
    const hasVariantOperations = input.operations.some((op) =>
      isVariantOperation(op),
    );

    if (hasVariantOperations) {
      const validation = await this.stepPreValidateVariantBatch(input);
      if (!validation.valid) {
        return {
          product: null,
          operationResults: input.operations.map((op, index) =>
            this.buildValidationFailureResult(
              op,
              validation.errorsByOperationIndex[index] ?? [],
            ),
          ),
          userErrors: validation.userErrors,
        };
      }
    }

    // 1. Acquire revision (atomic compare-and-swap)
    const acquired = await this.stepAcquireRevision(
      input.productId,
      input.expectedRevision,
    );
    if ("error" in acquired) {
      return {
        product: null,
        operationResults: [],
        userErrors: [acquired.error],
      };
    }
    const { revision } = acquired;

    // 2. Collect option updates for batch processing
    const optionUpdates: Array<{
      index: number;
      variantId: string;
      options: VariantOptionsUpdate;
    }> = [];

    // 3. Run operations, collect changes (options handled separately)
    const scriptCtx = this.toScriptContext(input.context);
    for (let i = 0; i < input.operations.length; i++) {
      const op = input.operations[i];
      if (op.type === "productUpdate") {
        const result = await this.stepProductUpdate(op.params, changes, scriptCtx);
        results.push(result);
      } else if (op.type === "productCategoryUpdate") {
        const result = await this.stepProductCategoryUpdate(
          op.params,
          changes,
          scriptCtx,
        );
        results.push(result);
      } else if (op.type === "productTagUpdate") {
        const result = await this.stepProductTagUpdate(
          op.params,
          changes,
          scriptCtx,
        );
        results.push(result);
      } else if (op.type === "variantCreate") {
        const result = await this.stepVariantCreate(op.params, changes, scriptCtx);
        results.push(result);
      } else if (op.type === "variantDelete") {
        const result = await this.stepVariantDelete(op.params, changes, scriptCtx);
        results.push(result);
      } else {
        // Collect option updates for batch processing
        if (op.params.options) {
          optionUpdates.push({
            index: i,
            variantId: op.params.variantId,
            options: {
              variantId: op.params.variantId,
              links: op.params.options.set,
            },
          });
        }
        // Process other variant fields (options handled in batch below)
        const result = await this.stepVariantUpdate(op.params, changes, scriptCtx);
        results.push(result);
      }
    }

    // 4. Process all option updates in a single batch (enables swapping)
    if (optionUpdates.length > 0) {
      const batchResults = await this.stepBatchUpdateOptions(
        input.productId,
        optionUpdates.map((u) => u.options),
        changes,
        scriptCtx,
      );

      // Merge batch results into corresponding operation results
      for (let i = 0; i < optionUpdates.length; i++) {
        const { index, variantId } = optionUpdates[i];
        const batchResult = batchResults.find((r) => r.variantId === variantId);
        if (batchResult) {
          if (!batchResult.applied) {
            results[index].applied = false;
            results[index].errors.push(...batchResult.errors);
          }
        }
      }
    }

    // 5. Emit event with partial snapshot + new revision
    const hasChanges =
      changes.product !== undefined || changes.variants !== undefined;
    if (hasChanges) {
      await this.workflowNotifyProductMediaBackRefs(input, changes);
      await this.workflowEmitEvent(input, changes, revision);
    }

    return {
      product: { id: input.productId, revision },
      operationResults: results,
      userErrors: results.flatMap((r) => r.errors),
    };
  }

  /**
   * Atomic compare-and-swap for optimistic locking.
   * Increments revision BEFORE any operations to prevent race conditions.
   */
  @WorkflowStep()
  private async stepAcquireRevision(
    productId: string,
    expectedRevision?: number,
  ): Promise<{ revision: number } | { error: UserError }> {
    const db = this.kernel.db;

    // Build WHERE clause
    const conditions = [eq(product.id, productId)];
    if (expectedRevision !== undefined) {
      conditions.push(eq(product.revision, expectedRevision));
    }

    // Atomic increment with compare-and-swap
    const result = await db
      .update(product)
      .set({ revision: sql`${product.revision} + 1` })
      .where(and(...conditions))
      .returning({ revision: product.revision });

    if (result.length === 0) {
      // Check if product exists at all
      const exists = await db
        .select({ id: product.id })
        .from(product)
        .where(eq(product.id, productId))
        .then((rows) => rows.length > 0);

      return {
        error: exists
          ? {
              message: "Product was modified by another user",
              code: "REVISION_CONFLICT",
              field: ["expectedRevision"],
            }
          : { message: "Product not found", code: "NOT_FOUND" },
      };
    }

    return { revision: result[0].revision };
  }

  @WorkflowStep()
  private async stepPreValidateVariantBatch(
    input: ProductUpdateWorkflowInput,
  ): Promise<VariantBatchValidationResult> {
    const errorsByOperationIndex: Record<number, UserError[]> = {};
    const userErrors: UserError[] = [];
    const variantOps = input.operations
      .map((op, index) => ({ op, index }))
      .filter((entry): entry is { op: VariantWorkflowOperation; index: number } =>
        isVariantOperation(entry.op),
      );
    const firstVariantIndex = variantOps[0]?.index ?? 0;

    const addError = (index: number, error: UserError) => {
      errorsByOperationIndex[index] = errorsByOperationIndex[index] ?? [];
      errorsByOperationIndex[index].push(error);
      userErrors.push(error);
    };

    const addRequestError = (error: UserError) => {
      addError(firstVariantIndex, error);
    };

    if (input.expectedRevision === undefined) {
      addRequestError({
        message: "Expected revision is required for variant operations",
        code: "EXPECTED_REVISION_REQUIRED",
        field: ["expectedRevision"],
      });
    }

    const currentProduct = await this.kernel.db
      .select({ id: product.id, revision: product.revision })
      .from(product)
      .where(eq(product.id, input.productId))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!currentProduct) {
      addRequestError({
        message: "Product not found",
        code: "NOT_FOUND",
        field: ["productId"],
      });
      return {
        valid: false,
        errorsByOperationIndex,
        userErrors,
      };
    }

    if (
      input.expectedRevision !== undefined &&
      currentProduct.revision !== input.expectedRevision
    ) {
      addRequestError({
        message: "Product was modified by another user",
        code: "REVISION_CONFLICT",
        field: ["expectedRevision"],
      });
    }

    const allProductVariants =
      await this.kernel.repository.variant.findByProductId(input.productId);
    const variantById = new Map(allProductVariants.map((v) => [v.id, v]));
    const productOptions =
      await this.kernel.repository.option.findByProductId(input.productId);
    const productOptionIds = productOptions.map((option) => option.id);
    const productOptionIdSet = new Set(productOptionIds);
    const valuesByOption =
      await this.kernel.repository.option.findValuesByOptionIds(productOptionIds);
    const valueToOptionId = new Map<string, string>();
    for (const [optionId, values] of valuesByOption) {
      for (const value of values) {
        valueToOptionId.set(value.id, optionId);
      }
    }

    for (const { op, index } of variantOps) {
      if (op.type !== "variantCreate" && !variantById.has(op.params.variantId)) {
        addError(index, {
          message: "Variant not found for this product",
          code: "NOT_FOUND",
          field: fieldPath(op, "variantId"),
        });
      }
    }

    const inventoryItemRequiredVariantIds = variantOps.flatMap(({ op }) =>
      op.type === "variantUpdate" &&
      (op.params.inventory || op.params.weight !== undefined)
        ? [op.params.variantId]
        : [],
    );
    const existingInventoryItems =
      await this.kernel.repository.inventoryItem.findActiveByVariantIds(
        inventoryItemRequiredVariantIds,
      );
    const inventoryItemVariantIds = new Set(
      existingInventoryItems.map((item) => item.variantId),
    );
    for (const { op, index } of variantOps) {
      if (
        op.type === "variantUpdate" &&
        (op.params.inventory || op.params.weight !== undefined) &&
        !inventoryItemVariantIds.has(op.params.variantId)
      ) {
        addError(index, {
          message: "Inventory item not found",
          code: "NOT_FOUND",
          field: fieldPath(op, "inventory"),
        });
      }
    }

    const currentLinksMap = await this.kernel.repository.option.findVariantLinks(
      allProductVariants.map((variant) => variant.id),
    );

    const createClientMutationIds = new Map<string, number>();
    for (const { op, index } of variantOps) {
      if (op.type !== "variantCreate") continue;
      const previousIndex = createClientMutationIds.get(
        op.params.clientMutationId,
      );
      if (previousIndex !== undefined) {
        const error: UserError = {
          message: "Client mutation ID must be unique within the request",
          code: "DUPLICATE_CLIENT_MUTATION_ID",
          field: fieldPath(op, "clientMutationId"),
        };
        addError(index, error);
        addError(previousIndex, {
          ...error,
          field: fieldPath(input.operations[previousIndex], "clientMutationId"),
        });
      } else {
        createClientMutationIds.set(op.params.clientMutationId, index);
      }
    }

    const warehouseIds = new Set<string>();
    const mediaFileIds = new Set<string>();
    const requestedSkus = new Map<string, number>();

    for (const { op, index } of variantOps) {
      if (op.type === "variantDelete") continue;

      const params = op.params;
      if (params.options) {
        validateVariantOptions({
          op,
          index,
          productOptions,
          productOptionIdSet,
          valueToOptionId,
          requireFullSet: op.type === "variantCreate",
          addError,
        });
      }

      if (params.pricing) {
        if (!SUPPORTED_CURRENCIES.has(params.pricing.currency)) {
          addError(index, {
            message: "Unsupported currency",
            code: "INVALID_CURRENCY",
            field: fieldPath(op, "pricing", "currency"),
          });
        }
        if (params.pricing.amountMinor < 0) {
          addError(index, {
            message: "Price amount must be a non-negative value",
            code: "INVALID_AMOUNT",
            field: fieldPath(op, "pricing", "amountMinor"),
          });
        }
        if (
          params.pricing.compareAtMinor != null &&
          params.pricing.compareAtMinor < 0
        ) {
          addError(index, {
            message: "Compare at price must be a non-negative value",
            code: "INVALID_COMPARE_AT",
            field: fieldPath(op, "pricing", "compareAtMinor"),
          });
        }
      }

      if (params.inventory) {
        warehouseIds.add(params.inventory.warehouseId);
        if (!Number.isInteger(params.inventory.onHand) || params.inventory.onHand < 0) {
          addError(index, {
            message: "On-hand quantity must be a non-negative integer",
            code: "INVALID_QUANTITY",
            field: fieldPath(op, "inventory", "onHand"),
          });
        }
        const unavailable = params.inventory.unavailable ?? 0;
        if (!Number.isInteger(unavailable) || unavailable < 0) {
          addError(index, {
            message: "Unavailable quantity must be a non-negative integer",
            code: "INVALID_QUANTITY",
            field: fieldPath(op, "inventory", "unavailable"),
          });
        }
        if (
          params.inventory.unitCostMinor != null &&
          (!Number.isInteger(params.inventory.unitCostMinor) ||
            params.inventory.unitCostMinor < 0)
        ) {
          addError(index, {
            message: "Unit cost must be a non-negative integer",
            code: "INVALID_COST",
            field: fieldPath(op, "inventory", "unitCostMinor"),
          });
        }
        if (
          params.inventory.costCurrency &&
          !SUPPORTED_CURRENCIES.has(params.inventory.costCurrency)
        ) {
          addError(index, {
            message: "Unsupported currency",
            code: "INVALID_CURRENCY",
            field: fieldPath(op, "inventory", "costCurrency"),
          });
        }
        if (params.inventory.sku) {
          const previousIndex = requestedSkus.get(params.inventory.sku);
          if (previousIndex !== undefined) {
            addError(index, {
              message: "SKU must be unique within the request",
              code: "SKU_ALREADY_EXISTS",
              field: fieldPath(op, "inventory", "sku"),
            });
            addError(previousIndex, {
              message: "SKU must be unique within the request",
              code: "SKU_ALREADY_EXISTS",
              field: fieldPath(input.operations[previousIndex], "inventory", "sku"),
            });
          } else {
            requestedSkus.set(params.inventory.sku, index);
          }
        }
      }

      if (params.dimensions) {
        if (!Number.isInteger(params.dimensions.width) || params.dimensions.width <= 0) {
          addError(index, {
            message: "Width must be a positive integer",
            code: "INVALID_DIMENSION",
            field: fieldPath(op, "dimensions", "width"),
          });
        }
        if (!Number.isInteger(params.dimensions.height) || params.dimensions.height <= 0) {
          addError(index, {
            message: "Height must be a positive integer",
            code: "INVALID_DIMENSION",
            field: fieldPath(op, "dimensions", "height"),
          });
        }
        if (!Number.isInteger(params.dimensions.length) || params.dimensions.length <= 0) {
          addError(index, {
            message: "Length must be a positive integer",
            code: "INVALID_DIMENSION",
            field: fieldPath(op, "dimensions", "length"),
          });
        }
      }

      if (
        params.weight != null &&
        (!Number.isInteger(params.weight) || params.weight <= 0)
      ) {
        addError(index, {
          message: "Weight must be a positive integer",
          code: "INVALID_WEIGHT",
          field: fieldPath(op, "weight"),
        });
      }

      if (params.media) {
        for (const fileId of params.media.fileIds) {
          mediaFileIds.add(fileId);
        }
      }
    }

    if (warehouseIds.size > 0) {
      const warehouses = await this.kernel.repository.warehouse.getByIds([
        ...warehouseIds,
      ]);
      const existingWarehouseIds = new Set(
        warehouses.map((warehouse) => warehouse.id),
      );
      for (const { op, index } of variantOps) {
        if (
          op.type !== "variantDelete" &&
          op.params.inventory &&
          !existingWarehouseIds.has(op.params.inventory.warehouseId)
        ) {
          addError(index, {
            message: "Warehouse not found",
            code: "NOT_FOUND",
            field: fieldPath(op, "inventory", "warehouseId"),
          });
        }
      }
    }

    if (mediaFileIds.size > 0) {
      const registeredMedia =
        await this.kernel.repository.media.getProductMediaByFileIds(
          input.productId,
          [...mediaFileIds],
        );
      const registeredFileIds = new Set(
        registeredMedia.map((media) => media.fileId),
      );
      for (const { op, index } of variantOps) {
        if (op.type === "variantDelete" || !op.params.media) continue;
        const missingFileId = op.params.media.fileIds.find(
          (fileId) => !registeredFileIds.has(fileId),
        );
        if (missingFileId) {
          addError(index, {
            message:
              "Variant media must be registered on the product before it can be attached",
            code: "PRODUCT_MEDIA_NOT_REGISTERED",
            field: fieldPath(op, "media", "fileIds"),
          });
        }
      }
    }

    for (const [sku, index] of requestedSkus) {
      const existingItem =
        await this.kernel.repository.inventoryItem.findBySku(sku);
      if (!existingItem) continue;
      const op = input.operations[index];
      const allowedVariantId =
        op.type === "variantUpdate" ? op.params.variantId : undefined;
      if (existingItem.variantId !== allowedVariantId) {
        addError(index, {
          message: `SKU "${sku}" is already in use`,
          code: "SKU_ALREADY_EXISTS",
          field: fieldPath(op, "inventory", "sku"),
        });
      }
    }

    const deleteVariantIds = new Set(
      variantOps.flatMap(({ op }) =>
        op.type === "variantDelete" ? [op.params.variantId] : [],
      ),
    );
    const createOps = variantOps.filter(({ op }) => op.type === "variantCreate");
    const optionValueCounts = productOptions.map(
      (option) => valuesByOption.get(option.id)?.length ?? 0,
    );
    const totalPossibleCombinations =
      optionValueCounts.length === 0
        ? 1
        : optionValueCounts.reduce((product, count) => product * count, 1);
    const remainingVariantCount = allProductVariants.filter(
      (variant) => !deleteVariantIds.has(variant.id),
    ).length;
    if (
      remainingVariantCount + createOps.length >
      totalPossibleCombinations
    ) {
      addError(createOps[0]?.index ?? firstVariantIndex, {
        message: "Variant option combinations exceed possible product combinations",
        code: "VARIANT_COMBINATION_LIMIT_EXCEEDED",
        field: fieldPath(createOps[0]?.op ?? variantOps[0].op, "options"),
      });
    }

    validateFinalVariantCombinations({
      variantOps,
      allProductVariants,
      currentLinksMap,
      productOptionIds,
      deleteVariantIds,
      errorsByOperationIndex,
      addError,
    });

    return {
      valid: userErrors.length === 0,
      errorsByOperationIndex,
      userErrors,
    };
  }

  private buildValidationFailureResult(
    op: ProductUpdateOperation,
    operationErrors: UserError[],
  ): OperationResult {
    const errors =
      operationErrors.length > 0
        ? operationErrors
        : [
            {
              message: "Batch validation failed",
              code: "BATCH_VALIDATION_FAILED",
              field: op.meta?.fieldPrefix,
            },
          ];
    const result: OperationResult = {
      type: op.type,
      applied: false,
      errors,
    };

    if (op.type === "variantCreate") {
      result.clientMutationId = op.params.clientMutationId;
    }
    if (op.type === "variantDelete") {
      result.entityId = op.params.variantId;
    }

    return result;
  }

  /**
   * Execute product-level updates.
   * Runs appropriate scripts based on provided parameters.
   */
  @WorkflowStep()
  private async stepProductUpdate(
    params: ProductUpdateParams,
    changes: ProductChanges,
    ctx: RunScriptContext,
  ): Promise<OperationResult> {
    const errors: UserError[] = [];
    const { id, handle, title, vendorId, content, seo, status, media } = params;

    // Identity fields (handle, title, vendor)
    if (handle !== undefined || title !== undefined || vendorId !== undefined) {
      const r = await this.kernel.runScript(ProductUpdateScript, {
        id,
        handle,
        title,
        vendorId,
      }, ctx);
      errors.push(...r.userErrors);
      if (r.changes) {
        changes.product = { ...changes.product, ...r.changes };
      }
    }

    // Content fields (description, excerpt)
    if (content) {
      const r = await this.kernel.runScript(ProductUpdateContentScript, {
        id,
        ...content,
      }, ctx);
      errors.push(...r.userErrors);
      if (r.changes) {
        changes.product = { ...changes.product, content: r.changes };
      }
    }

    // SEO fields
    if (seo) {
      const r = await this.kernel.runScript(ProductUpdateSeoScript, {
        id,
        ...seo,
      }, ctx);
      errors.push(...r.userErrors);
      if (r.changes) {
        changes.product = { ...changes.product, seo: r.changes };
      }
    }

    // Status change
    if (status) {
      const r = await this.kernel.runScript(ProductUpdateStatusScript, {
        id,
        status,
      }, ctx);
      errors.push(...r.userErrors);
      if (r.changes) {
        changes.product = { ...changes.product, status: r.changes.status };
      }
    }

    // Media
    if (media) {
      const r = await this.kernel.runScript(ProductUpdateMediaScript, {
        id,
        fileIds: media.fileIds,
      }, ctx);
      errors.push(...r.userErrors);
      if (r.changes) {
        changes.product = { ...changes.product, media: r.changes };
      }
    }

    return {
      type: "productUpdate",
      applied: errors.length === 0,
      errors,
    };
  }

  @WorkflowStep()
  private async stepProductCategoryUpdate(
    params: ProductCategoryUpdateParams,
    changes: ProductChanges,
    ctx: RunScriptContext,
  ): Promise<OperationResult> {
    const errors: UserError[] = [];
    const { productId, categoryId } = params;

    let affectedProductIds: string[] | undefined;

    if (params.action === "add") {
      const r = await this.kernel.runScript(
        CategoryAddProductScript,
        { categoryId, productId },
        ctx,
      );
      errors.push(...r.userErrors);
      affectedProductIds = r.affectedProductIds;
    } else if (params.action === "remove") {
      const r = await this.kernel.runScript(
        CategoryRemoveProductScript,
        { categoryId, productId },
        ctx,
      );
      errors.push(...r.userErrors);
      affectedProductIds = r.affectedProductIds;
    } else if (params.action === "setPrimary") {
      const r = await this.kernel.runScript(
        CategorySetProductPrimaryScript,
        { categoryId, productId },
        ctx,
      );
      errors.push(...r.userErrors);
      affectedProductIds = r.affectedProductIds;
    } else {
      const r = await this.kernel.runScript(
        CategoryMoveProductScript,
        {
          categoryId,
          productId,
          afterProductId: params.afterProductId ?? undefined,
          beforeProductId: params.beforeProductId ?? undefined,
        },
        ctx,
      );
      errors.push(...r.userErrors);
      affectedProductIds = r.affectedProductIds;
    }

    if (errors.length === 0 && affectedProductIds?.includes(productId)) {
      const currentCategories = changes.product?.categories;
      const categoryIds = [
        ...new Set([...(currentCategories?.categoryIds ?? []), categoryId]),
      ];
      const reason =
        params.action === "move" && currentCategories?.reason !== "assignment"
          ? "rank"
          : "assignment";

      changes.product = {
        ...changes.product,
        categories: {
          changed: true,
          reason,
          categoryIds,
        },
      };
    }

    return {
      type: "productCategoryUpdate",
      applied: errors.length === 0,
      errors,
    };
  }

  @WorkflowStep()
  private async stepProductTagUpdate(
    params: ProductTagUpdateParams,
    changes: ProductChanges,
    ctx: RunScriptContext,
  ): Promise<OperationResult> {
    const errors: UserError[] = [];
    const { productId, tagId } = params;

    let affectedProductIds: string[] | undefined;

    if (params.action === "add") {
      const r = await this.kernel.runScript(
        ProductTagAddScript,
        { productId, tagId },
        ctx,
      );
      errors.push(...r.userErrors);
      affectedProductIds = r.affectedProductIds;
    } else {
      const r = await this.kernel.runScript(
        ProductTagRemoveScript,
        { productId, tagId },
        ctx,
      );
      errors.push(...r.userErrors);
      affectedProductIds = r.affectedProductIds;
    }

    if (errors.length === 0 && affectedProductIds?.includes(productId)) {
      const currentTags = changes.product?.tags;
      const tagIds = [...new Set([...(currentTags?.tagIds ?? []), tagId])];

      changes.product = {
        ...changes.product,
        tags: {
          changed: true,
          reason: "assignment",
          tagIds,
        },
      };
    }

    return {
      type: "productTagUpdate",
      applied: errors.length === 0,
      errors,
    };
  }

  /**
   * Execute variant-level updates (excluding options and inventory).
   * Options are always processed in batch via stepBatchUpdateOptions.
   * Inventory operations are handled by Inventory Service.
   */
  @WorkflowStep()
  private async stepVariantCreate(
    params: VariantCreateParams,
    changes: ProductChanges,
    ctx: RunScriptContext,
  ): Promise<OperationResult> {
    const errors: UserError[] = [];
    const createResult = await this.kernel.runScript(VariantCreateScript, {
      productId: params.productId,
      options: params.options.set,
    }, ctx);
    errors.push(...createResult.userErrors);

    if (!createResult.variant) {
      return {
        type: "variantCreate",
        applied: false,
        clientMutationId: params.clientMutationId,
        errors,
      };
    }

    const variantId = createResult.variant.id;
    const mergeVariantChanges = (c: Partial<VariantChanges>) => {
      changes.variants = changes.variants ?? {};
      changes.variants[variantId] = {
        ...changes.variants[variantId],
        ...c,
        physical: {
          ...changes.variants[variantId]?.physical,
          ...c.physical,
        },
      };
    };

    mergeVariantChanges({
      lifecycle: "created",
      options: params.options.set.map((link) => ({
        optionId: link.optionId,
        valueId: link.optionValueId,
      })),
    });

    if (params.inventory || params.weight !== undefined) {
      await this.broker.call<Inventory.CreateItemResult, Inventory.CreateItemParams>(
        "inventory.createItem",
        {
          storeId: ctx.storeId,
          variantId,
          trackInventory: false,
        },
      );
    }

    if (params.pricing) {
      const r = await this.kernel.runScript(VariantUpdatePricingScript, {
        variantId,
        ...params.pricing,
      }, ctx);
      errors.push(...r.userErrors);
      if (r.changes) mergeVariantChanges({ pricing: r.changes });
    }

    if (params.inventory) {
      const r = await this.broker.call<Inventory.UpdateItemResult, Inventory.UpdateItemParams>(
        "inventory.updateItem",
        {
          storeId: ctx.storeId,
          variantId,
          warehouseId: params.inventory.warehouseId,
          onHand: params.inventory.onHand,
          unavailable: params.inventory.unavailable,
          sku: params.inventory.sku,
          unitCostMinor: params.inventory.unitCostMinor,
          costCurrency: params.inventory.costCurrency,
        },
      );
      if (!r.success) {
        errors.push(...mapBrokerErrors(r.userErrors));
      } else {
        mergeVariantChanges({
          inventory: {
            warehouseId: params.inventory.warehouseId,
            onHand: params.inventory.onHand,
            unavailable: params.inventory.unavailable ?? 0,
            sku: params.inventory.sku,
            unitCostMinor: params.inventory.unitCostMinor,
            costCurrency: params.inventory.costCurrency,
          },
        });
      }
    }

    if (params.weight !== undefined) {
      const r = await this.kernel.runScript(InventoryItemUpdateScript, {
        variantId,
        weight: params.weight,
      }, ctx);
      errors.push(...r.userErrors);
      if (r.changes?.weight !== undefined) {
        mergeVariantChanges({ physical: { weight: r.changes.weight } });
      }
    }

    if (params.dimensions) {
      const r = await this.broker.call<Inventory.UpdateItemDimensionsResult, Inventory.UpdateItemDimensionsParams>(
        "inventory.updateItemDimensions",
        {
          storeId: ctx.storeId,
          variantId,
          width: params.dimensions.width,
          height: params.dimensions.height,
          length: params.dimensions.length,
        },
      );
      if (!r.success) {
        errors.push(...mapBrokerErrors(r.userErrors));
      } else {
        mergeVariantChanges({
          physical: {
            width: params.dimensions.width,
            height: params.dimensions.height,
            length: params.dimensions.length,
          },
        });
      }
    }

    if (params.media) {
      const r = await this.kernel.runScript(VariantUpdateMediaScript, {
        variantId,
        ...params.media,
      }, ctx);
      errors.push(...r.userErrors);
      if (r.changes) mergeVariantChanges({ media: r.changes });
    }

    return {
      type: "variantCreate",
      applied: errors.length === 0,
      clientMutationId: params.clientMutationId,
      entityId: variantId,
      errors,
    };
  }

  @WorkflowStep()
  private async stepVariantDelete(
    params: VariantDeleteParams,
    changes: ProductChanges,
    ctx: RunScriptContext,
  ): Promise<OperationResult> {
    const result = await this.kernel.runScript(VariantDeleteScript, {
      id: params.variantId,
      permanent: false,
    }, ctx);

    if (result.userErrors.length === 0 && result.deletedVariantId) {
      changes.variants = changes.variants ?? {};
      changes.variants[result.deletedVariantId] = {
        ...changes.variants[result.deletedVariantId],
        lifecycle: "deleted",
      };
    }

    return {
      type: "variantDelete",
      applied: result.userErrors.length === 0,
      entityId: result.deletedVariantId ?? params.variantId,
      errors: result.userErrors,
    };
  }

  @WorkflowStep()
  private async stepVariantUpdate(
    params: VariantUpdateParams,
    changes: ProductChanges,
    ctx: RunScriptContext,
  ): Promise<OperationResult> {
    const errors: UserError[] = [];
    const { variantId, pricing, media } = params;

    // Helper to merge variant changes
    const mergeVariantChanges = (c: Partial<VariantChanges>) => {
      changes.variants = changes.variants ?? {};
      changes.variants[variantId] = {
        ...changes.variants[variantId],
        lifecycle: "updated",
        ...c,
        physical: {
          ...changes.variants[variantId]?.physical,
          ...c.physical,
        },
      };
    };

    if (pricing) {
      const r = await this.kernel.runScript(VariantUpdatePricingScript, {
        variantId,
        ...pricing,
      }, ctx);
      errors.push(...r.userErrors);
      if (r.changes) mergeVariantChanges({ pricing: r.changes });
    }

    // Inventory operations are delegated to the Inventory Service via broker
    if (params.inventory) {
      const r = await this.broker.call<Inventory.UpdateItemResult, Inventory.UpdateItemParams>(
        "inventory.updateItem",
        {
          storeId: ctx.storeId,
          variantId,
          warehouseId: params.inventory.warehouseId,
          onHand: params.inventory.onHand,
          unavailable: params.inventory.unavailable,
          sku: params.inventory.sku,
          unitCostMinor: params.inventory.unitCostMinor,
          costCurrency: params.inventory.costCurrency,
        },
      );
      if (!r.success) {
        errors.push(...mapBrokerErrors(r.userErrors));
      } else {
        mergeVariantChanges({
          inventory: {
            warehouseId: params.inventory.warehouseId,
            onHand: params.inventory.onHand,
            unavailable: params.inventory.unavailable ?? 0,
            sku: params.inventory.sku,
            unitCostMinor: params.inventory.unitCostMinor,
            costCurrency: params.inventory.costCurrency,
          },
        });
      }
    }

    if (params.weight !== undefined) {
      const r = await this.kernel.runScript(InventoryItemUpdateScript, {
        variantId,
        weight: params.weight,
      }, ctx);
      errors.push(...r.userErrors);
      if (r.changes?.weight !== undefined) {
        mergeVariantChanges({ physical: { weight: r.changes.weight } });
      }
    }

    if (params.dimensions) {
      const r = await this.broker.call<Inventory.UpdateItemDimensionsResult, Inventory.UpdateItemDimensionsParams>(
        "inventory.updateItemDimensions",
        {
          storeId: ctx.storeId,
          variantId,
          width: params.dimensions.width,
          height: params.dimensions.height,
          length: params.dimensions.length,
        },
      );
      if (!r.success) {
        errors.push(...mapBrokerErrors(r.userErrors));
      } else {
        mergeVariantChanges({
          physical: {
            width: params.dimensions.width,
            height: params.dimensions.height,
            length: params.dimensions.length,
          },
        });
      }
    }

    if (media) {
      const r = await this.kernel.runScript(VariantUpdateMediaScript, {
        variantId,
        ...media,
      }, ctx);
      errors.push(...r.userErrors);
      if (r.changes) mergeVariantChanges({ media: r.changes });
    }

    return {
      type: "variantUpdate",
      applied: errors.length === 0,
      errors,
    };
  }

  /**
   * Batch update variant options.
   * Processes all option updates in a single step to allow swapping.
   */
  @WorkflowStep()
  private async stepBatchUpdateOptions(
    productId: string,
    updates: VariantOptionsUpdate[],
    changes: ProductChanges,
    ctx: RunScriptContext,
  ): Promise<Array<{ variantId: string; applied: boolean; errors: UserError[] }>> {
    const r = await this.kernel.runScript(VariantBatchUpdateOptionsScript, {
      productId,
      updates,
    }, ctx);

    if (r.userErrors.length > 0) {
      // Script-level error
      return updates.map((u) => ({
        variantId: u.variantId,
        applied: false,
        errors: r.userErrors,
      }));
    }

    const results = r.result ?? [];

    // Merge changes for successful updates
    for (const result of results) {
      if (result.applied && result.changes) {
        changes.variants = changes.variants ?? {};
        changes.variants[result.variantId] = {
          ...changes.variants[result.variantId],
          lifecycle: "updated",
          options: result.changes,
        };
      }
    }

    return results.map((result) => ({
      variantId: result.variantId,
      applied: result.applied,
      errors: result.errors,
    }));
  }

  /**
   * Emit productUpdated event with partial snapshot.
   */
  private async workflowNotifyProductMediaBackRefs(
    input: ProductUpdateWorkflowInput,
    changes: ProductChanges,
  ): Promise<void> {
    const mediaChanges = changes.product?.media;

    if (!mediaChanges) {
      return;
    }

    try {
      await this.broker.runSaga<unknown, BackRefNotifyInput>(
        "catalog.backRefNotify",
        {
          entityRef: {
            service: "catalog",
            entityType: "product",
            entityId: input.productId,
          },
          fileIds: mediaChanges.fileIds,
        },
        {
          source: "workflow",
          workflowId: `productUpdate:${input.productId}`,
          stepId: "notifyProductMediaBackRefs",
        },
      );
    } catch (error) {
      this.logger.error(
        {
          productId: input.productId,
          error,
          fileCount: mediaChanges.fileIds.length,
        },
        "Failed to start product media back-ref sync saga",
      );
    }
  }

  /**
   * Emit productUpdated event with partial snapshot.
   */
  private async workflowEmitEvent(
    input: ProductUpdateWorkflowInput,
    changes: ProductChanges,
    revision: number,
  ): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "productUpdated",
        payload: {
          productId: input.productId,
          storeId: input.context.storeId,
          revision,
          product: changes.product,
          variants: changes.variants,
        },
        source: "catalog",
        context: {
          tenantId: input.context.organizationId,
          userId: input.context.userId,
        },
        subject: { type: "product", id: input.productId },
        actor: input.context.userId
          ? { type: "user", id: input.context.userId }
          : undefined,
        emitKey: `product:${input.productId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitProductUpdated",
        callId: input.productId,
      },
    );
  }
}

function isVariantOperation(
  op: ProductUpdateOperation,
): op is VariantWorkflowOperation {
  return (
    op.type === "variantCreate" ||
    op.type === "variantUpdate" ||
    op.type === "variantDelete"
  );
}

function fieldPath(op: ProductUpdateOperation, ...parts: string[]): string[] {
  return [...(op.meta?.fieldPrefix ?? []), ...parts];
}

function validateVariantOptions(args: {
  op: Exclude<VariantWorkflowOperation, { type: "variantDelete" }>;
  index: number;
  productOptions: Array<{ id: string }>;
  productOptionIdSet: Set<string>;
  valueToOptionId: Map<string, string>;
  requireFullSet: boolean;
  addError: (index: number, error: UserError) => void;
}) {
  const {
    op,
    index,
    productOptions,
    productOptionIdSet,
    valueToOptionId,
    requireFullSet,
    addError,
  } = args;
  const links = op.params.options?.set ?? [];
  const seenOptionIds = new Map<string, number>();

  for (const [linkIndex, link] of links.entries()) {
    const previousIndex = seenOptionIds.get(link.optionId);
    if (previousIndex !== undefined) {
      addError(index, {
        message: "Variant options cannot contain duplicate option IDs",
        code: "DUPLICATE_OPTION",
        field: fieldPath(op, "options", "set", String(linkIndex), "optionId"),
      });
      addError(index, {
        message: "Variant options cannot contain duplicate option IDs",
        code: "DUPLICATE_OPTION",
        field: fieldPath(op, "options", "set", String(previousIndex), "optionId"),
      });
    } else {
      seenOptionIds.set(link.optionId, linkIndex);
    }

    if (!productOptionIdSet.has(link.optionId)) {
      addError(index, {
        message: "Option does not belong to this product",
        code: "INVALID_OPTION",
        field: fieldPath(op, "options", "set", String(linkIndex), "optionId"),
      });
    }

    const expectedOptionId = valueToOptionId.get(link.optionValueId);
    if (!expectedOptionId) {
      addError(index, {
        message: "Option value not found",
        code: "INVALID_OPTION_VALUE",
        field: fieldPath(
          op,
          "options",
          "set",
          String(linkIndex),
          "optionValueId",
        ),
      });
    } else if (expectedOptionId !== link.optionId) {
      addError(index, {
        message: "Option value does not belong to option",
        code: "INVALID_OPTION_VALUE",
        field: fieldPath(
          op,
          "options",
          "set",
          String(linkIndex),
          "optionValueId",
        ),
      });
    }
  }

  if (!requireFullSet) {
    return;
  }

  for (const option of productOptions) {
    if (!seenOptionIds.has(option.id)) {
      addError(index, {
        message: "Create operation must include one value for every product option",
        code: "MISSING_OPTION_VALUE",
        field: fieldPath(op, "options"),
      });
    }
  }

  if (links.length !== productOptions.length) {
    addError(index, {
      message: "Create operation must include one value for every product option",
      code: "INVALID_OPTION_COUNT",
      field: fieldPath(op, "options"),
    });
  }
}

function validateFinalVariantCombinations(args: {
  variantOps: Array<{ op: VariantWorkflowOperation; index: number }>;
  allProductVariants: Array<{ id: string }>;
  currentLinksMap: Map<
    string,
    Array<{ optionId: string; optionValueId: string | null }>
  >;
  productOptionIds: string[];
  deleteVariantIds: Set<string>;
  errorsByOperationIndex: Record<number, UserError[]>;
  addError: (index: number, error: UserError) => void;
}) {
  const {
    variantOps,
    allProductVariants,
    currentLinksMap,
    productOptionIds,
    deleteVariantIds,
    errorsByOperationIndex,
    addError,
  } = args;
  const ownerByCombination = new Map<
    string,
    { variantId?: string; operationIndex?: number; op?: ProductUpdateOperation }
  >();
  const updateOpsByVariantId = new Map<
    string,
    { op: Extract<VariantWorkflowOperation, { type: "variantUpdate" }>; index: number }
  >();

  for (const entry of variantOps) {
    if (entry.op.type === "variantUpdate" && entry.op.params.options) {
      updateOpsByVariantId.set(entry.op.params.variantId, {
        op: entry.op,
        index: entry.index,
      });
    }
  }

  for (const variant of allProductVariants) {
    if (deleteVariantIds.has(variant.id)) continue;
    const updateEntry = updateOpsByVariantId.get(variant.id);
    if (updateEntry && errorsByOperationIndex[updateEntry.index]?.length) {
      continue;
    }

    const links =
      updateEntry?.op.params.options?.set ??
      (currentLinksMap.get(variant.id) ?? []);
    const key = variantCombinationKey(links, productOptionIds);
    const previous = ownerByCombination.get(key);
    if (previous?.operationIndex !== undefined && updateEntry) {
      addDuplicateCombinationError(addError, updateEntry.index, updateEntry.op);
      if (previous.op) {
        addDuplicateCombinationError(
          addError,
          previous.operationIndex,
          previous.op,
        );
      }
    } else if (previous && updateEntry) {
      addDuplicateCombinationError(addError, updateEntry.index, updateEntry.op);
    }

    ownerByCombination.set(key, {
      variantId: variant.id,
      operationIndex: updateEntry?.index,
      op: updateEntry?.op,
    });
  }

  for (const { op, index } of variantOps) {
    if (op.type !== "variantCreate") continue;
    if (errorsByOperationIndex[index]?.length) continue;

    const key = variantCombinationKey(op.params.options.set, productOptionIds);
    const previous = ownerByCombination.get(key);
    if (previous) {
      addDuplicateCombinationError(addError, index, op);
      if (previous.operationIndex !== undefined && previous.op) {
        addDuplicateCombinationError(
          addError,
          previous.operationIndex,
          previous.op,
        );
      }
    }

    ownerByCombination.set(key, {
      operationIndex: index,
      op,
    });
  }
}

function variantCombinationKey(
  links: Array<{ optionId: string; optionValueId: string | null }>,
  productOptionIds: string[],
): string {
  const optionOrder = new Map(
    productOptionIds.map((optionId, index) => [optionId, index]),
  );
  return [...links]
    .filter((link) => link.optionValueId)
    .sort((a, b) => {
      const aOrder = optionOrder.get(a.optionId) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = optionOrder.get(b.optionId) ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.optionId.localeCompare(b.optionId);
    })
    .map((link) => `${link.optionId}:${link.optionValueId}`)
    .join("|");
}

function addDuplicateCombinationError(
  addError: (index: number, error: UserError) => void,
  index: number,
  op: ProductUpdateOperation,
) {
  addError(index, {
    message: "Variant option combination already exists",
    code: "VARIANT_COMBINATION_DUPLICATE",
    field: fieldPath(op, "options"),
  });
}

function mapBrokerErrors(
  errors: Array<{ message: string; code: string; field?: string[] }>,
): UserError[] {
  return errors.map((error) => ({
    message: error.message,
    code: error.code,
    field: error.field,
  }));
}
