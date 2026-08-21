import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  ChildWorkflowStep,
  Workflow,
  WorkflowStep,
  InjectBroker,
  Policy,
  ServiceBroker,
  DBOS,
  type DurableStepResult,
} from "@shopana/shared-kernel";
import type { ProductUpdatedReason } from "@shopana/events";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import type {
  ProductUpdateWorkflowInput,
  ProductUpdateWorkflowResult,
  ProductUpdateParams,
  ProductCategoryUpdateParams,
  ProductTagUpdateParams,
  ProductOptionsSyncParams,
  ProductFeaturesSyncParams,
  VariantCreateParams,
  VariantUpdateParams,
  VariantDeleteParams,
  OperationResult,
  WorkflowContext,
  ProductUpdateOperation,
} from "./dto/ProductUpdateWorkflowDto.js";
import type {
  ProductChanges,
  ProductCategoryFieldChanges,
  ProductTagFieldChanges,
  VariantChanges,
} from "../scripts/types/ProductChanges.js";
import type { UserError } from "../scripts/types/ScriptResult.js";

import { ProductUpdateScript } from "../scripts/product/ProductUpdateScript.js";
import { ProductUpdateContentScript } from "../scripts/product/ProductUpdateContentScript.js";
import { ProductUpdateSeoScript } from "../scripts/product/ProductUpdateSeoScript.js";
import { ProductUpdateStatusScript } from "../scripts/product/ProductUpdateStatusScript.js";
import { ProductUpdateMediaScript } from "../scripts/product/ProductUpdateMediaScript.js";
import {
  CategoryAddProductScript,
  CategoryMoveProductScript,
  CategoryProductsCountRefreshScript,
  CategoryRemoveProductScript,
  CategorySetProductPrimaryScript,
} from "../scripts/category/index.js";
import { ProductTagAddScript, ProductTagRemoveScript } from "../scripts/tag/index.js";
import { VariantUpdatePricingScript } from "../scripts/variant/VariantUpdatePricingScript.js";
import { VariantUpdateMediaScript } from "../scripts/variant/VariantUpdateMediaScript.js";
import { VariantCreateScript } from "../scripts/variant/VariantCreateScript.js";
import { VariantDeleteScript } from "../scripts/variant/VariantDeleteScript.js";
import {
  VariantBatchUpdateOptionsScript,
  type VariantOptionsUpdate,
} from "../scripts/variant/VariantBatchUpdateOptionsScript.js";
import {
  InventoryItemCreateScript,
  InventoryItemUpdateScript,
} from "../scripts/inventory-item/index.js";
import type { BackRefNotifyInput } from "../sagas/index.js";
import { OptionsSyncScript } from "../scripts/option/OptionsSyncScript.js";
import { FeaturesSyncScript } from "../scripts/feature/FeaturesSyncScript.js";
import {
  ProductUpdateReadScript,
  type ProductUpdateReadQuery,
} from "../scripts/product/ProductUpdateReadScript.js";
import {
  ProductComponentOperationScript,
  type ProductComponentWorkflowOperation,
} from "../scripts/component/index.js";
import { TransactionalStep } from "./CatalogTransactionalStep.js";

type VariantWorkflowOperation = Extract<
  ProductUpdateOperation,
  { type: "variantCreate" | "variantUpdate" | "variantDelete" }
>;

type ComponentWorkflowOperation = ProductComponentWorkflowOperation;

interface VariantBatchValidationResult {
  valid: boolean;
  errorsByOperationIndex: Record<number, UserError[]>;
  userErrors: UserError[];
}

type ProductOperationStepResult = DurableStepResult<OperationResult, ProductChanges>;
type BatchOptionsStepResult = DurableStepResult<
  Array<{ operationIndex: number; variantId: string; applied: boolean; errors: UserError[] }>,
  ProductChanges
>;

/**
 * ProductUpdateWorkflow for Catalog Service.
 * Handles atomic product updates with:
 * - Partial failure support (each operation independent)
 * - Event emission with update reasons
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

  private read<T>(query: ProductUpdateReadQuery, context: RunScriptContext): Promise<T> {
    return this.kernel.runScript(ProductUpdateReadScript, query, context) as Promise<T>;
  }

  @Workflow("productUpdate")
  @Policy<ProductUpdateWorkflowInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(input: ProductUpdateWorkflowInput): Promise<ProductUpdateWorkflowResult> {
    const results: OperationResult[] = [];
    const changes: ProductChanges = { productId: input.productId };
    const hasVariantOperations = input.operations.some((op) => isVariantOperation(op));

    const scriptCtx = this.toScriptContext(input.context);
    const productExists = await this.stepProductExists(input.productId, scriptCtx);
    if (!productExists) {
      return {
        product: null,
        operationResults: [],
        userErrors: [{ message: "Product not found", code: "NOT_FOUND" }],
      };
    }

    const definitionValidation = await this.stepPreValidateDefinitions(input, scriptCtx);
    if (!definitionValidation.valid) {
      return {
        product: null,
        operationResults: input.operations.map((op, index) =>
          this.buildValidationFailureResult(
            op,
            definitionValidation.errorsByOperationIndex[index] ?? [],
          ),
        ),
        userErrors: definitionValidation.userErrors,
      };
    }

    if (hasVariantOperations) {
      const validation = await this.stepPreValidateVariantBatch(input, scriptCtx);
      if (!validation.valid) {
        return {
          product: null,
          operationResults: input.operations.map((op, index) =>
            this.buildValidationFailureResult(op, validation.errorsByOperationIndex[index] ?? []),
          ),
          userErrors: validation.userErrors,
        };
      }
    }

    // Collect option updates for batch processing
    const optionUpdates: Array<{
      index: number;
      variantId: string;
      options: VariantOptionsUpdate;
    }> = [];

    // Run operations, collect changes (options handled separately)
    for (let i = 0; i < input.operations.length; i++) {
      const op = input.operations[i];
      if (op.type === "productUpdate") {
        const step = await this.stepProductUpdate(op.params, scriptCtx);
        mergeProductChanges(changes, step.changes);
        results.push(prefixOperationResultErrors(step.result, op));
      } else if (op.type === "productCategoryUpdate") {
        const step = await this.stepProductCategoryUpdate(op.params, scriptCtx);
        mergeProductChanges(changes, step.changes);
        results.push(prefixOperationResultErrors(step.result, op));
      } else if (op.type === "productTagUpdate") {
        const step = await this.stepProductTagUpdate(op.params, scriptCtx);
        mergeProductChanges(changes, step.changes);
        results.push(prefixOperationResultErrors(step.result, op));
      } else if (op.type === "productOptionsSync") {
        const step = await this.stepProductOptionsSync(op.params, scriptCtx);
        mergeProductChanges(changes, step.changes);
        results.push(prefixOperationResultErrors(step.result, op));
      } else if (op.type === "productFeaturesSync") {
        const step = await this.stepProductFeaturesSync(op.params, scriptCtx);
        mergeProductChanges(changes, step.changes);
        results.push(prefixOperationResultErrors(step.result, op));
      } else if (isComponentOperation(op)) {
        const step = await this.stepProductComponentOperation(op, scriptCtx);
        mergeProductChanges(changes, step.changes);
        results.push(prefixOperationResultErrors(step.result, op));
      } else if (op.type === "variantCreate") {
        const step = await this.stepVariantCreate(op.params, scriptCtx);
        mergeProductChanges(changes, step.changes);
        results.push(prefixOperationResultErrors(step.result, op));
      } else if (op.type === "variantDelete") {
        const step = await this.stepVariantDelete(input.productId, op.params, scriptCtx);
        mergeProductChanges(changes, step.changes);
        results.push(prefixOperationResultErrors(step.result, op));
      } else {
        // Collect option updates for batch processing
        if (op.params.options) {
          optionUpdates.push({
            index: op.meta?.operationIndex ?? i,
            variantId: op.params.variantId,
            options: {
              variantId: op.params.variantId,
              links: op.params.options.set,
            },
          });
        }
        // Process other variant fields (options handled in batch below)
        const step = await this.stepVariantUpdate(input.productId, op.params, scriptCtx);
        mergeProductChanges(changes, step.changes);
        results.push(prefixOperationResultErrors(step.result, op));
      }
    }

    // Process all option updates in a single batch (enables swapping)
    if (optionUpdates.length > 0) {
      const batchStep = await this.stepBatchUpdateOptions(
        input.productId,
        optionUpdates.map((u) => ({ operationIndex: u.index, options: u.options })),
        scriptCtx,
      );
      mergeProductChanges(changes, batchStep.changes);
      const batchResults = batchStep.result;

      // Merge batch results into corresponding operation results
      for (let i = 0; i < optionUpdates.length; i++) {
        const { index } = optionUpdates[i];
        const batchResult = batchResults.find((r) => r.operationIndex === index);
        if (batchResult) {
          if (!batchResult.applied) {
            results[index].applied = false;
            results[index].errors.push(
              ...prefixUserErrors(batchResult.errors, input.operations[index]),
            );
          }
        }
      }
    }

    // Emit event with update reasons
    const hasChanges =
      changes.product !== undefined ||
      changes.component !== undefined ||
      changes.variants !== undefined;
    if (hasChanges) {
      await this.workflowNotifyProductMediaBackRefs(input, changes);
      await this.workflowEmitEvent(input, changes);
    }

    return {
      product: { id: input.productId },
      operationResults: results,
      userErrors: results.flatMap((r) => r.errors),
    };
  }

  @WorkflowStep()
  private async stepPreValidateDefinitions(
    input: ProductUpdateWorkflowInput,
    context: RunScriptContext,
  ): Promise<VariantBatchValidationResult> {
    const errorsByOperationIndex: Record<number, UserError[]> = {};
    const userErrors: UserError[] = [];

    for (const [index, op] of input.operations.entries()) {
      let errors: UserError[] = [];
      if (op.type === "productOptionsSync") {
        const validation = await this.read<VariantBatchValidationResult>(
          { type: "optionSyncValidation", params: op.params },
          context,
        );
        errors = prefixUserErrors(validation.userErrors, op);
      } else if (op.type === "productFeaturesSync") {
        const validation = await this.read<VariantBatchValidationResult>(
          { type: "featureSyncValidation", params: op.params },
          context,
        );
        errors = prefixUserErrors(validation.userErrors, op);
      } else if (op.type === "productUpdate") {
        if (op.params.vendorId !== undefined && op.params.vendorId !== null) {
          const vendor = await this.read<{ id: string } | null>(
            { type: "vendor", vendorId: op.params.vendorId },
            context,
          );
          if (!vendor) {
            errors.push({
              message: "Vendor not found",
              code: "MISSING_VENDOR",
              field: fieldPath(op, "vendorId"),
            });
          }
        }

        if (op.params.handle !== undefined) {
          const productWithHandle = await this.read<{ id: string } | null>(
            { type: "productByHandle", handle: op.params.handle },
            context,
          );
          if (productWithHandle && productWithHandle.id !== op.params.id) {
            errors.push({
              message: "Product with this handle already exists",
              code: "DUPLICATE_HANDLE",
              field: fieldPath(op, "handle"),
            });
          }
        }

        if (op.params.status === "published") {
          const effective = (
            await this.read<Array<{ profileId: string | null }>>(
              { type: "effectiveProfiles", productId: op.params.id },
              context,
            )
          )[0];
          const configured = await this.read<string[]>(
            { type: "configurationProfileIds", productId: op.params.id },
            context,
          );
          if (configured.some((profileId) => profileId !== effective?.profileId)) {
            errors.push({
              message: "Product comparison configuration does not match its effective profile",
              code: "COMPARISON_EFFECTIVE_PROFILE_MISMATCH",
              field: fieldPath(op, "status"),
            });
          }
        }
      }

      if (errors.length > 0) {
        errorsByOperationIndex[index] = errors;
        userErrors.push(...errors);
      }
    }

    return {
      valid: userErrors.length === 0,
      errorsByOperationIndex,
      userErrors,
    };
  }

  @WorkflowStep()
  private async stepProductExists(productId: string, context: RunScriptContext): Promise<boolean> {
    return this.read<boolean>({ type: "productExists", productId }, context);
  }

  @WorkflowStep()
  private async stepPreValidateVariantBatch(
    input: ProductUpdateWorkflowInput,
    context: RunScriptContext,
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

    const currentProduct = await this.read<boolean>(
      { type: "productExists", productId: input.productId },
      context,
    );

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

    const allProductVariants = await this.read<Array<{ id: string }>>(
      { type: "variants", productId: input.productId },
      context,
    );
    const variantById = new Map(allProductVariants.map((v) => [v.id, v]));
    const optionsSyncOperation = input.operations.find(
      (op): op is Extract<ProductUpdateOperation, { type: "productOptionsSync" }> =>
        op.type === "productOptionsSync",
    );
    const storedProductOptions = optionsSyncOperation
      ? undefined
      : await this.read<Array<{ id: string }>>(
          { type: "options", productId: input.productId },
          context,
        );
    const productOptions: Array<{ id: string }> = optionsSyncOperation
      ? optionsSyncOperation.params.options.map((option, index) => ({
          id: option.id ?? `pending-option:${index}`,
        }))
      : (storedProductOptions ?? []);
    const productOptionIds = productOptions.map((option) => option.id);
    const productOptionIdSet = new Set(productOptionIds);
    const valuesByOption: Map<string, Array<{ id: string }>> = optionsSyncOperation
      ? new Map(
          optionsSyncOperation.params.options.map((option, optionIndex) => {
            const optionId = option.id ?? `pending-option:${optionIndex}`;
            return [
              optionId,
              option.values.map((value, valueIndex) => ({
                id: value.id ?? `pending-value:${optionIndex}:${valueIndex}`,
              })),
            ];
          }),
        )
      : await this.read<Map<string, Array<{ id: string }>>>(
          { type: "optionValues", optionIds: productOptionIds },
          context,
        );
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
      (op.params.inventory || op.params.weight !== undefined || op.params.dimensions !== undefined)
        ? [op.params.variantId]
        : [],
    );
    const existingInventoryItems = await this.read<Array<{ variantId: string }>>(
      { type: "inventoryItems", variantIds: inventoryItemRequiredVariantIds },
      context,
    );
    const inventoryItemVariantIds = new Set(existingInventoryItems.map((item) => item.variantId));
    for (const { op, index } of variantOps) {
      if (
        op.type === "variantUpdate" &&
        (op.params.inventory ||
          op.params.weight !== undefined ||
          op.params.dimensions !== undefined) &&
        !inventoryItemVariantIds.has(op.params.variantId)
      ) {
        addError(index, {
          message: "Inventory item not found",
          code: "NOT_FOUND",
          field: fieldPath(op, "inventory"),
        });
      }
    }

    const storedCurrentLinksMap = await this.read<
      Map<string, Array<{ optionId: string; optionValueId: string | null }>>
    >(
      { type: "variantLinks", variantIds: allProductVariants.map((variant) => variant.id) },
      context,
    );
    const currentLinksMap = optionsSyncOperation
      ? new Map(
          [...storedCurrentLinksMap].map(([variantId, links]) => [
            variantId,
            links.filter(
              (link) =>
                link.optionValueId !== null &&
                valueToOptionId.get(link.optionValueId) === link.optionId,
            ),
          ]),
        )
      : storedCurrentLinksMap;

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
        if (params.pricing.amountMinor < 0) {
          addError(index, {
            message: "Price amount must be a non-negative value",
            code: "INVALID_AMOUNT",
            field: fieldPath(op, "pricing", "amountMinor"),
          });
        }
        if (params.pricing.compareAtMinor != null && params.pricing.compareAtMinor < 0) {
          addError(index, {
            message: "Compare at price must be a non-negative value",
            code: "INVALID_COMPARE_AT",
            field: fieldPath(op, "pricing", "compareAtMinor"),
          });
        }
      }

      if (params.inventory) {
        const hasWarehouseId = params.inventory.warehouseId !== undefined;
        const hasOnHand = params.inventory.onHand !== undefined;
        if (hasWarehouseId !== hasOnHand) {
          addError(index, {
            message: "Warehouse ID and on-hand quantity must be provided together",
            code: "REQUIRED_TOGETHER",
            field: fieldPath(op, "inventory"),
          });
        }
        if (params.inventory.warehouseId) {
          warehouseIds.add(params.inventory.warehouseId);
        }
        if (
          params.inventory.onHand !== undefined &&
          (!Number.isInteger(params.inventory.onHand) || params.inventory.onHand < 0)
        ) {
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
          (!Number.isInteger(params.inventory.unitCostMinor) || params.inventory.unitCostMinor < 0)
        ) {
          addError(index, {
            message: "Unit cost must be a non-negative integer",
            code: "INVALID_COST",
            field: fieldPath(op, "inventory", "unitCostMinor"),
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

        if (
          op.type === "variantUpdate" &&
          params.inventory.warehouseId &&
          params.inventory.onHand !== undefined
        ) {
          const existingStock = await this.read<{ reservedQty: number } | null>(
            {
              type: "stock",
              variantId: params.variantId,
              warehouseId: params.inventory.warehouseId,
            },
            context,
          );
          const reservedQuantity = existingStock?.reservedQty ?? 0;
          const unavailable = params.inventory.unavailable ?? 0;
          if (params.inventory.onHand - reservedQuantity - unavailable < 0) {
            addError(index, {
              message: "Available quantity cannot be negative",
              code: "INVALID_QUANTITY",
              field: fieldPath(op, "inventory", "onHand"),
            });
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

      if (params.weight != null && (!Number.isInteger(params.weight) || params.weight <= 0)) {
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
      const warehouses = await this.read<Array<{ id: string }>>(
        { type: "warehouses", warehouseIds: [...warehouseIds] },
        context,
      );
      const existingWarehouseIds = new Set(warehouses.map((warehouse) => warehouse.id));
      for (const { op, index } of variantOps) {
        if (
          op.type !== "variantDelete" &&
          op.params.inventory &&
          op.params.inventory.warehouseId &&
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
      const registeredMedia = await this.read<Array<{ fileId: string }>>(
        { type: "productMedia", productId: input.productId, fileIds: [...mediaFileIds] },
        context,
      );
      const registeredFileIds = new Set(registeredMedia.map((media) => media.fileId));
      for (const { op, index } of variantOps) {
        if (op.type === "variantDelete" || !op.params.media) continue;
        const missingFileId = op.params.media.fileIds.find(
          (fileId) => !registeredFileIds.has(fileId),
        );
        if (missingFileId) {
          addError(index, {
            message: "Variant media must be registered on the product before it can be attached",
            code: "PRODUCT_MEDIA_NOT_REGISTERED",
            field: fieldPath(op, "media", "fileIds"),
          });
        }
      }
    }

    for (const [sku, index] of requestedSkus) {
      const existingItem = await this.read<{ variantId: string } | null>(
        { type: "inventoryItemBySku", sku },
        context,
      );
      if (!existingItem) continue;
      const op = input.operations[index];
      const allowedVariantId = op.type === "variantUpdate" ? op.params.variantId : undefined;
      if (existingItem.variantId !== allowedVariantId) {
        addError(index, {
          message: `SKU "${sku}" is already in use`,
          code: "SKU_ALREADY_EXISTS",
          field: fieldPath(op, "inventory", "sku"),
        });
      }
    }

    const deleteVariantIds = new Set(
      variantOps.flatMap(({ op }) => (op.type === "variantDelete" ? [op.params.variantId] : [])),
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
    if (remainingVariantCount + createOps.length > totalPossibleCombinations) {
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

    if (
      op.type === "variantDelete" ||
      op.type === "productComponentConfigurationUpdate" ||
      op.type === "productComponentConfigurationDelete" ||
      op.type === "productComponentGroupsSync" ||
      op.type === "productComponentPricingTemplatesSync" ||
      op.type === "productComponentDependencyRulesSync"
    ) {
      result.entityId =
        op.type === "variantDelete" ? op.params.variantId : op.params.configurationId;
    }
    return result;
  }

  /**
   * Execute product-level updates.
   * Runs appropriate scripts based on provided parameters.
   */
  @TransactionalStep()
  private async stepProductUpdate(
    params: ProductUpdateParams,
    ctx: RunScriptContext,
  ): Promise<ProductOperationStepResult> {
    const changes: ProductChanges = { productId: params.id };
    const errors: UserError[] = [];
    const { id, handle, title, vendorId, content, seo, status, media } = params;

    // Status validation can return a business error. It must run before any
    // other product write in this aggregate operation.
    if (status) {
      const r = await this.kernel.runScript(
        ProductUpdateStatusScript,
        {
          id,
          status,
        },
        ctx,
      );
      errors.push(...r.userErrors);
      if (r.changes) {
        changes.product = { ...changes.product, status: r.changes.status };
      }
    }

    // Identity fields (handle, title, vendor)
    if (handle !== undefined || title !== undefined || vendorId !== undefined) {
      const r = await this.kernel.runScript(
        ProductUpdateScript,
        {
          id,
          handle,
          title,
          vendorId,
        },
        ctx,
      );
      errors.push(...r.userErrors);
      if (r.changes) {
        changes.product = { ...changes.product, ...r.changes };
      }
    }

    // Content fields (description, excerpt)
    if (content) {
      const r = await this.kernel.runScript(
        ProductUpdateContentScript,
        {
          id,
          ...content,
        },
        ctx,
      );
      errors.push(...r.userErrors);
      if (r.changes) {
        changes.product = { ...changes.product, content: r.changes };
      }
    }

    // SEO fields
    if (seo) {
      const r = await this.kernel.runScript(
        ProductUpdateSeoScript,
        {
          id,
          ...seo,
        },
        ctx,
      );
      errors.push(...r.userErrors);
      if (r.changes) {
        changes.product = { ...changes.product, seo: r.changes };
      }
    }

    // Media
    if (media) {
      const r = await this.kernel.runScript(
        ProductUpdateMediaScript,
        {
          id,
          fileIds: media.fileIds,
        },
        ctx,
      );
      errors.push(...r.userErrors);
      if (r.changes) {
        changes.product = { ...changes.product, media: r.changes };
      }
    }

    return { result: { type: "productUpdate", applied: errors.length === 0, errors }, changes };
  }

  @TransactionalStep()
  private async stepProductCategoryUpdate(
    params: ProductCategoryUpdateParams,
    ctx: RunScriptContext,
  ): Promise<ProductOperationStepResult> {
    const changes: ProductChanges = { productId: params.productId };
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
      const categoryIds = [...new Set([...(currentCategories?.categoryIds ?? []), categoryId])];
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

      if (reason === "assignment") {
        await this.stepRefreshCategoryProductCounts(categoryIds, ctx);
      }
    }

    return {
      result: { type: "productCategoryUpdate", applied: errors.length === 0, errors },
      changes,
    };
  }

  @TransactionalStep()
  private async stepProductTagUpdate(
    params: ProductTagUpdateParams,
    ctx: RunScriptContext,
  ): Promise<ProductOperationStepResult> {
    const changes: ProductChanges = { productId: params.productId };
    const errors: UserError[] = [];
    const { productId, tagId } = params;

    let affectedProductIds: string[] | undefined;

    if (params.action === "add") {
      const r = await this.kernel.runScript(ProductTagAddScript, { productId, tagId }, ctx);
      errors.push(...r.userErrors);
      affectedProductIds = r.affectedProductIds;
    } else {
      const r = await this.kernel.runScript(ProductTagRemoveScript, { productId, tagId }, ctx);
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

    return { result: { type: "productTagUpdate", applied: errors.length === 0, errors }, changes };
  }

  @TransactionalStep()
  private async stepProductOptionsSync(
    params: ProductOptionsSyncParams,
    ctx: RunScriptContext,
  ): Promise<ProductOperationStepResult> {
    const changes: ProductChanges = { productId: params.productId };
    const result = await this.kernel.runScript(OptionsSyncScript, params, ctx);

    if (result.userErrors.length === 0) {
      changes.product = {
        ...changes.product,
        options: { changed: true },
      };
    }

    return {
      result: {
        type: "productOptionsSync",
        applied: result.userErrors.length === 0,
        errors: result.userErrors,
      },
      changes,
    };
  }

  @TransactionalStep()
  private async stepProductFeaturesSync(
    params: ProductFeaturesSyncParams,
    ctx: RunScriptContext,
  ): Promise<ProductOperationStepResult> {
    const changes: ProductChanges = { productId: params.productId };
    const result = await this.kernel.runScript(FeaturesSyncScript, params, ctx);

    if (result.userErrors.length === 0) {
      changes.product = {
        ...changes.product,
        features: { changed: true },
      };
    }

    return {
      result: {
        type: "productFeaturesSync",
        applied: result.userErrors.length === 0,
        errors: result.userErrors,
      },
      changes,
    };
  }

  @TransactionalStep()
  private async stepProductComponentOperation(
    operation: ComponentWorkflowOperation,
    ctx: RunScriptContext,
  ): Promise<ProductOperationStepResult> {
    const result = await this.kernel.runScript(ProductComponentOperationScript, operation, ctx);

    const operationResult: OperationResult = {
      type: operation.type,
      applied: result.userErrors.length === 0,
      entityId: result.entityId,
      errors: result.userErrors,
    };
    return {
      result: operationResult,
      changes: operationResult.applied
        ? { productId: operation.params.productId, component: { changed: true } }
        : { productId: operation.params.productId },
    };
  }

  /**
   * Execute variant-level updates (excluding options and inventory).
   * Options are always processed in batch via stepBatchUpdateOptions.
   * Inventory operations are handled by Inventory Service.
   */
  @TransactionalStep()
  private async stepVariantCreate(
    params: VariantCreateParams,
    ctx: RunScriptContext,
  ): Promise<ProductOperationStepResult> {
    const changes: ProductChanges = { productId: params.productId };
    const errors: UserError[] = [];
    const createResult = await this.kernel.runScript(
      VariantCreateScript,
      {
        productId: params.productId,
        options: params.options.set,
      },
      ctx,
    );
    errors.push(...createResult.userErrors);

    if (!createResult.variant) {
      return { result: { type: "variantCreate", applied: false, errors }, changes };
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

    if (params.inventory || params.weight !== undefined || params.dimensions) {
      const inventoryItem = await this.kernel.runScript(
        InventoryItemCreateScript,
        {
          variantId,
          sku: params.inventory?.sku,
          trackInventory: params.inventory?.trackInventory ?? false,
          requiresShipping: params.inventory?.requiresShipping ?? false,
          continueSellingWhenOutOfStock: params.inventory?.continueSellingWhenOutOfStock,
        },
        ctx,
      );
      errors.push(...inventoryItem.userErrors);
    }

    if (params.inventory || params.weight !== undefined || params.dimensions) {
      const r = await this.kernel.runScript(
        InventoryItemUpdateScript,
        {
          variantId,
          warehouseId: params.inventory?.warehouseId,
          onHand: params.inventory?.onHand,
          unavailable: params.inventory?.unavailable,
          sku: params.inventory?.sku,
          trackInventory: params.inventory?.trackInventory,
          requiresShipping: params.inventory?.requiresShipping,
          continueSellingWhenOutOfStock: params.inventory?.continueSellingWhenOutOfStock,
          unitCostMinor: params.inventory?.unitCostMinor,
          costCurrency: params.inventory?.costCurrency,
          weight: params.weight,
          dimensions: params.dimensions
            ? {
                widthMm: params.dimensions.width,
                heightMm: params.dimensions.height,
                lengthMm: params.dimensions.length,
              }
            : undefined,
        },
        ctx,
      );
      errors.push(...r.userErrors);
      if (r.changes) {
        mergeVariantChanges({
          inventory: {
            warehouseId: r.changes.warehouseId,
            onHand: r.changes.onHand,
            unavailable: r.changes.unavailable,
            sku: r.changes.sku,
            trackInventory: r.changes.trackInventory,
            requiresShipping: r.changes.requiresShipping,
            continueSellingWhenOutOfStock: r.changes.continueSellingWhenOutOfStock,
            unitCostMinor: r.changes.unitCostMinor,
            costCurrency: r.changes.costCurrency,
          },
        });
      }
      if (r.changes?.weight !== undefined) {
        mergeVariantChanges({ physical: { weight: r.changes.weight } });
      }
      if (r.changes?.dimensions) {
        mergeVariantChanges({
          physical: {
            width: r.changes.dimensions.widthMm,
            height: r.changes.dimensions.heightMm,
            length: r.changes.dimensions.lengthMm,
          },
        });
      }
    }

    if (params.pricing) {
      const r = await this.kernel.runScript(
        VariantUpdatePricingScript,
        {
          variantId,
          ...params.pricing,
        },
        ctx,
      );
      errors.push(...r.userErrors);
      if (r.changes) mergeVariantChanges({ pricing: r.changes });
    }

    if (params.media) {
      const r = await this.kernel.runScript(
        VariantUpdateMediaScript,
        {
          variantId,
          ...params.media,
        },
        ctx,
      );
      errors.push(...r.userErrors);
      if (r.changes) mergeVariantChanges({ media: r.changes });
    }

    return {
      result: { type: "variantCreate", applied: errors.length === 0, entityId: variantId, errors },
      changes,
    };
  }

  @TransactionalStep()
  private async stepVariantDelete(
    productId: string,
    params: VariantDeleteParams,
    ctx: RunScriptContext,
  ): Promise<ProductOperationStepResult> {
    const changes: ProductChanges = { productId };
    const result = await this.kernel.runScript(
      VariantDeleteScript,
      {
        id: params.variantId,
        permanent: false,
      },
      ctx,
    );

    if (result.userErrors.length === 0 && result.deletedVariantId) {
      changes.variants = changes.variants ?? {};
      changes.variants[result.deletedVariantId] = {
        ...changes.variants[result.deletedVariantId],
        lifecycle: "deleted",
      };
    }

    return {
      result: {
        type: "variantDelete",
        applied: result.userErrors.length === 0,
        entityId: result.deletedVariantId ?? params.variantId,
        errors: result.userErrors,
      },
      changes,
    };
  }

  @TransactionalStep()
  private async stepVariantUpdate(
    productId: string,
    params: VariantUpdateParams,
    ctx: RunScriptContext,
  ): Promise<ProductOperationStepResult> {
    const changes: ProductChanges = { productId };
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

    if (params.inventory || params.weight !== undefined || params.dimensions) {
      const r = await this.kernel.runScript(
        InventoryItemUpdateScript,
        {
          variantId,
          warehouseId: params.inventory?.warehouseId,
          onHand: params.inventory?.onHand,
          unavailable: params.inventory?.unavailable,
          sku: params.inventory?.sku,
          trackInventory: params.inventory?.trackInventory,
          requiresShipping: params.inventory?.requiresShipping,
          continueSellingWhenOutOfStock: params.inventory?.continueSellingWhenOutOfStock,
          unitCostMinor: params.inventory?.unitCostMinor,
          costCurrency: params.inventory?.costCurrency,
          weight: params.weight,
          dimensions: params.dimensions
            ? {
                widthMm: params.dimensions.width,
                heightMm: params.dimensions.height,
                lengthMm: params.dimensions.length,
              }
            : undefined,
        },
        ctx,
      );
      errors.push(...r.userErrors);
      if (r.changes) {
        mergeVariantChanges({
          inventory: {
            warehouseId: r.changes.warehouseId,
            onHand: r.changes.onHand,
            unavailable: r.changes.unavailable,
            sku: r.changes.sku,
            trackInventory: r.changes.trackInventory,
            requiresShipping: r.changes.requiresShipping,
            continueSellingWhenOutOfStock: r.changes.continueSellingWhenOutOfStock,
            unitCostMinor: r.changes.unitCostMinor,
            costCurrency: r.changes.costCurrency,
          },
        });
      }
      if (r.changes?.weight !== undefined) {
        mergeVariantChanges({ physical: { weight: r.changes.weight } });
      }
      if (r.changes?.dimensions) {
        mergeVariantChanges({
          physical: {
            width: r.changes.dimensions.widthMm,
            height: r.changes.dimensions.heightMm,
            length: r.changes.dimensions.lengthMm,
          },
        });
      }
    }

    if (pricing) {
      const r = await this.kernel.runScript(
        VariantUpdatePricingScript,
        {
          variantId,
          ...pricing,
        },
        ctx,
      );
      errors.push(...r.userErrors);
      if (r.changes) mergeVariantChanges({ pricing: r.changes });
    }

    if (media) {
      const r = await this.kernel.runScript(
        VariantUpdateMediaScript,
        {
          variantId,
          ...media,
        },
        ctx,
      );
      errors.push(...r.userErrors);
      if (r.changes) mergeVariantChanges({ media: r.changes });
    }

    return { result: { type: "variantUpdate", applied: errors.length === 0, errors }, changes };
  }

  /**
   * Batch update variant options.
   * Processes all option updates in a single step to allow swapping.
   */
  @TransactionalStep()
  private async stepBatchUpdateOptions(
    productId: string,
    updates: Array<{ operationIndex: number; options: VariantOptionsUpdate }>,
    ctx: RunScriptContext,
  ): Promise<BatchOptionsStepResult> {
    const changes: ProductChanges = { productId };
    const r = await this.kernel.runScript(
      VariantBatchUpdateOptionsScript,
      {
        productId,
        updates: updates.map((update) => update.options),
      },
      ctx,
    );

    if (r.userErrors.length > 0) {
      // Script-level error
      return {
        result: updates.map((update) => ({
          operationIndex: update.operationIndex,
          variantId: update.options.variantId,
          applied: false,
          errors: r.userErrors,
        })),
        changes,
      };
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

    return {
      result: results.map((result, index) => ({
        operationIndex: updates[index]!.operationIndex,
        variantId: result.variantId,
        applied: result.applied,
        errors: result.errors,
      })),
      changes,
    };
  }

  /**
   * Notify media service about product media references collected during update.
   */
  @ChildWorkflowStep()
  private async workflowNotifyProductMediaBackRefs(
    input: ProductUpdateWorkflowInput,
    changes: ProductChanges,
  ): Promise<void> {
    const mediaChanges = changes.product?.media;

    if (!mediaChanges) {
      return;
    }

    await this.broker.runSaga<unknown, BackRefNotifyInput>(
      "catalog.backRefNotify",
      {
        entityRef: {
          service: "catalog",
          entityType: "product",
          entityId: input.productId,
        },
        storeId: input.context.storeId,
        fileIds: mediaChanges.fileIds,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "notifyProductMediaBackRefs",
        callId: input.productId,
        organizationId: input.context.organizationId,
      },
    );
  }

  /**
   * Emit productUpdated event with update reasons.
   */
  @ChildWorkflowStep()
  private async workflowEmitEvent(
    input: ProductUpdateWorkflowInput,
    changes: ProductChanges,
  ): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "productUpdated",
        payload: {
          productId: input.productId,
          storeId: input.context.storeId,
          reasons: getProductUpdatedReasons(changes),
        },
        context: {
          organizationId: input.context.organizationId,
          userId: input.context.userId,
        },
        subject: { type: "product", id: input.productId },
        actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
        emitKey: `product:${input.productId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitProductUpdated",
        callId: input.productId,
        organizationId: input.context.organizationId,
      },
    );
  }

  private async stepRefreshCategoryProductCounts(
    categoryIds: readonly string[],
    ctx: RunScriptContext,
  ): Promise<void> {
    const result = await this.kernel.runScript(
      CategoryProductsCountRefreshScript,
      { categoryIds },
      ctx,
    );

    if (!result.success) {
      throw new Error("Failed to refresh category product counts");
    }
  }
}

function getProductUpdatedReasons(changes: ProductChanges): ProductUpdatedReason[] {
  const reasons = new Set<ProductUpdatedReason>();
  const productChanges = changes.product;

  if (productChanges) {
    if (
      productChanges.handle !== undefined ||
      productChanges.title !== undefined ||
      productChanges.vendorId !== undefined
    ) {
      reasons.add("identity");
    }
    if (productChanges.content !== undefined) reasons.add("content");
    if (productChanges.seo !== undefined) reasons.add("seo");
    if (productChanges.status !== undefined) reasons.add("status");
    if (productChanges.media !== undefined) reasons.add("media");
    if (productChanges.tags !== undefined) reasons.add("tag");
    if (productChanges.categories !== undefined) reasons.add("category");
    if (productChanges.options !== undefined) reasons.add("options");
    if (productChanges.features !== undefined) reasons.add("features");
  }
  if (changes.component !== undefined) reasons.add("component");

  for (const variantChanges of Object.values(changes.variants ?? {})) {
    if (variantChanges.lifecycle !== undefined) reasons.add("variant");
    if (variantChanges.pricing !== undefined) reasons.add("pricing");
    if (variantChanges.inventory !== undefined) reasons.add("inventory");
    if (variantChanges.physical !== undefined) reasons.add("physical");
    if (variantChanges.media !== undefined) reasons.add("media");
    if (variantChanges.options !== undefined) reasons.add("options");
  }

  const sorted = sortProductUpdatedReasons(reasons);
  if (sorted.length === 0) {
    throw new Error("Product update event reasons could not be derived");
  }

  return sorted;
}

function sortProductUpdatedReasons(
  reasons: ReadonlySet<ProductUpdatedReason>,
): ProductUpdatedReason[] {
  const order: ProductUpdatedReason[] = [
    "identity",
    "content",
    "seo",
    "status",
    "media",
    "category",
    "tag",
    "options",
    "features",
    "component",
    "variant",
    "pricing",
    "inventory",
    "physical",
  ];

  return order.filter((reason) => reasons.has(reason));
}

/** Rebuild workflow-level change hints exclusively from checkpointed step output. */
function mergeProductChanges(target: ProductChanges, source: ProductChanges | null): void {
  if (!source) return;

  if (source.product) {
    target.product = {
      ...target.product,
      ...source.product,
      categories: mergeCategoryChanges(target.product?.categories, source.product.categories),
      tags: mergeTagChanges(target.product?.tags, source.product.tags),
    };
  }

  if (source.component) target.component = source.component;

  for (const [variantId, variantChanges] of Object.entries(source.variants ?? {})) {
    target.variants = target.variants ?? {};
    target.variants[variantId] = {
      ...target.variants[variantId],
      ...variantChanges,
      physical: {
        ...target.variants[variantId]?.physical,
        ...variantChanges.physical,
      },
    };
  }
}

function mergeCategoryChanges(
  current: ProductCategoryFieldChanges | undefined,
  next: ProductCategoryFieldChanges | undefined,
): ProductCategoryFieldChanges | undefined {
  if (!current) return next;
  if (!next) return current;
  return {
    ...current,
    ...next,
    reason:
      current.reason === "assignment" || next.reason === "assignment" ? "assignment" : next.reason,
    categoryIds: [...new Set([...(current.categoryIds ?? []), ...(next.categoryIds ?? [])])],
  };
}

function mergeTagChanges(
  current: ProductTagFieldChanges | undefined,
  next: ProductTagFieldChanges | undefined,
): ProductTagFieldChanges | undefined {
  if (!current) return next;
  if (!next) return current;
  return {
    ...current,
    ...next,
    tagIds: [...new Set([...(current.tagIds ?? []), ...(next.tagIds ?? [])])],
  };
}

function isVariantOperation(op: ProductUpdateOperation): op is VariantWorkflowOperation {
  return op.type === "variantCreate" || op.type === "variantUpdate" || op.type === "variantDelete";
}

function isComponentOperation(op: ProductUpdateOperation): op is ComponentWorkflowOperation {
  return op.type.startsWith("productComponent");
}

function fieldPath(op: ProductUpdateOperation, ...parts: string[]): string[] {
  return [...(op.meta?.fieldPrefix ?? []), ...parts];
}

function prefixOperationResultErrors(
  result: OperationResult,
  op: ProductUpdateOperation,
): OperationResult {
  return {
    ...result,
    errors: prefixUserErrors(result.errors, op),
  };
}

function prefixUserErrors(errors: readonly UserError[], op: ProductUpdateOperation): UserError[] {
  const fieldPrefix = op.meta?.fieldPrefix;
  if (!fieldPrefix || fieldPrefix.length === 0) {
    return [...errors];
  }

  const lastPrefixPart = fieldPrefix[fieldPrefix.length - 1];
  return errors.map((error) => {
    const field = error.field ?? [];
    let relativeField = field;
    if (relativeField[0] === lastPrefixPart || relativeField[0] === "input") {
      relativeField = relativeField.slice(1);
    }

    if (isProductIdField(op, relativeField)) {
      return {
        ...error,
        field: productIdFieldPath(fieldPrefix),
      };
    }

    if (op.type === "variantDelete" && relativeField[0] === "id") {
      relativeField = ["variantId", ...relativeField.slice(1)];
    }

    return {
      ...error,
      field: [...fieldPrefix, ...relativeField],
    };
  });
}

function isProductIdField(op: ProductUpdateOperation, field: readonly string[]): boolean {
  return field[0] === "productId" || (op.type === "productUpdate" && field[0] === "id");
}

function productIdFieldPath(fieldPrefix: readonly string[]): string[] {
  const operationsIndex = fieldPrefix.lastIndexOf("operations");
  return operationsIndex === -1
    ? ["productId"]
    : [...fieldPrefix.slice(0, operationsIndex), "productId"];
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
        field: fieldPath(op, "options", "set", String(linkIndex), "optionValueId"),
      });
    } else if (expectedOptionId !== link.optionId) {
      addError(index, {
        message: "Option value does not belong to option",
        code: "INVALID_OPTION_VALUE",
        field: fieldPath(op, "options", "set", String(linkIndex), "optionValueId"),
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
  currentLinksMap: Map<string, Array<{ optionId: string; optionValueId: string | null }>>;
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

    const links = updateEntry?.op.params.options?.set ?? currentLinksMap.get(variant.id) ?? [];
    const key = variantCombinationKey(links, productOptionIds);
    const previous = ownerByCombination.get(key);
    if (previous?.operationIndex !== undefined && updateEntry) {
      addDuplicateCombinationError(addError, updateEntry.index, updateEntry.op);
      if (previous.op) {
        addDuplicateCombinationError(addError, previous.operationIndex, previous.op);
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
        addDuplicateCombinationError(addError, previous.operationIndex, previous.op);
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
  const optionOrder = new Map(productOptionIds.map((optionId, index) => [optionId, index]));
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
