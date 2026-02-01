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
import { product } from "../repositories/models/index.js";
import type {
  ProductUpdateWorkflowInput,
  ProductUpdateWorkflowResult,
  ProductUpdateParams,
  VariantUpdateParams,
  OperationResult,
} from "./dto/ProductUpdateWorkflowDto.js";
import type {
  ProductChanges,
  VariantChanges,
} from "../scripts/types/ProductChanges.js";
import type { UserError } from "../scripts/types/ScriptResult.js";

import { ProductUpdateScript } from "../scripts/product/ProductUpdateScript.js";
import { ProductUpdateContentScript } from "../scripts/product/ProductUpdateContentScript.js";
import { ProductUpdateSeoScript } from "../scripts/product/ProductUpdateSeoScript.js";
import { ProductUpdateStatusScript } from "../scripts/product/ProductUpdateStatusScript.js";
import { ProductUpdateMediaScript } from "../scripts/product/ProductUpdateMediaScript.js";
import { VariantUpdatePricingScript } from "../scripts/variant/VariantUpdatePricingScript.js";
import { VariantUpdateInventoryScript } from "../scripts/variant/VariantUpdateInventoryScript.js";
import { VariantUpdateDimensionsScript } from "../scripts/variant/VariantUpdateDimensionsScript.js";
import { VariantUpdateMediaScript } from "../scripts/variant/VariantUpdateMediaScript.js";
import { VariantUpdateOptionsScript } from "../scripts/variant/VariantUpdateOptionsScript.js";

/**
 * ProductUpdateWorkflow handles atomic product updates with:
 * - Optimistic locking via revision field
 * - Partial failure support (each operation independent)
 * - Event emission with partial snapshot of changes
 */
@Injectable()
export class ProductUpdateWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("inventory") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
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

    // 2. Run operations, collect changes
    for (const op of input.operations) {
      const result =
        op.type === "productUpdate"
          ? await this.stepProductUpdate(op.params, changes)
          : await this.stepVariantUpdate(op.params, changes);
      results.push(result);
    }

    // 3. Emit event with partial snapshot + new revision
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
  ): Promise<OperationResult> {
    const errors: UserError[] = [];
    const { id, handle, title, content, seo, status, media } = params;

    // Identity fields (handle, title)
    if (handle !== undefined || title !== undefined) {
      const r = await this.kernel.runScript(ProductUpdateScript, {
        id,
        handle,
        title,
      });
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
      });
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
      });
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
      });
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
      });
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

  /**
   * Execute variant-level updates.
   * Runs appropriate scripts based on provided parameters.
   */
  @WorkflowStep()
  private async stepVariantUpdate(
    params: VariantUpdateParams,
    changes: ProductChanges,
  ): Promise<OperationResult> {
    const errors: UserError[] = [];
    const { variantId, pricing, inventory, dimensions, media, options } =
      params;

    // Helper to merge variant changes
    const mergeVariantChanges = (c: Partial<VariantChanges>) => {
      changes.variants = changes.variants ?? {};
      changes.variants[variantId] = { ...changes.variants[variantId], ...c };
    };

    if (pricing) {
      const r = await this.kernel.runScript(VariantUpdatePricingScript, {
        variantId,
        ...pricing,
      });
      errors.push(...r.userErrors);
      if (r.changes) mergeVariantChanges({ pricing: r.changes });
    }

    if (inventory) {
      const r = await this.kernel.runScript(VariantUpdateInventoryScript, {
        variantId,
        ...inventory,
      });
      errors.push(...r.userErrors);
      if (r.changes) mergeVariantChanges({ inventory: r.changes });
    }

    if (dimensions) {
      const r = await this.kernel.runScript(VariantUpdateDimensionsScript, {
        variantId,
        ...dimensions,
      });
      errors.push(...r.userErrors);
      if (r.changes) mergeVariantChanges({ dimensions: r.changes });
    }

    if (media) {
      const r = await this.kernel.runScript(VariantUpdateMediaScript, {
        variantId,
        ...media,
      });
      errors.push(...r.userErrors);
      if (r.changes) mergeVariantChanges({ media: r.changes });
    }

    if (options) {
      const r = await this.kernel.runScript(VariantUpdateOptionsScript, {
        variantId,
        links: options.set,
      });
      errors.push(...r.userErrors);
      if (r.changes) mergeVariantChanges({ options: r.changes });
    }

    return {
      type: "variantUpdate",
      applied: errors.length === 0,
      errors,
    };
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
        source: "inventory",
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
