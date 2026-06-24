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
  VariantUpdateParams,
  OperationResult,
  WorkflowContext,
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
import {
  VariantBatchUpdateOptionsScript,
  type VariantOptionsUpdate,
} from "../scripts/variant/VariantBatchUpdateOptionsScript.js";

/**
 * ProductUpdateWorkflow for Catalog Service.
 * Handles atomic product updates with:
 * - Optimistic locking via revision field
 * - Partial failure support (each operation independent)
 * - Event emission with partial snapshot of changes
 * - Product category assignment operations for bulk and single updates
 *
 * Does NOT contain inventory operations (inventory, dimensions) - they live in Inventory Service.
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
      changes.variants[variantId] = { ...changes.variants[variantId], ...c };
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
          weight: params.inventory.weight,
          unitCostMinor: params.inventory.unitCostMinor,
          costCurrency: params.inventory.costCurrency,
        },
      );
      if (!r.success) {
        errors.push(...r.userErrors.map((e: { message: string; code: string; field?: string[] }) => ({
          message: e.message,
          code: e.code,
          field: e.field,
        })));
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
        errors.push(...r.userErrors.map((e: { message: string; code: string; field?: string[] }) => ({
          message: e.message,
          code: e.code,
          field: e.field,
        })));
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
