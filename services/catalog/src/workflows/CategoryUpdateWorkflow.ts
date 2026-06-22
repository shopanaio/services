import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  Workflow,
  WorkflowStep,
  InjectBroker,
  ServiceBroker,
  DBOS,
} from "@shopana/shared-kernel";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import {
  category,
  product,
  productCategory,
} from "../repositories/models/index.js";
import { CategoryUpdateContentScript } from "../scripts/category/CategoryUpdateContentScript.js";
import { CategoryUpdateHierarchyScript } from "../scripts/category/CategoryUpdateHierarchyScript.js";
import { CategoryUpdateIdentityScript } from "../scripts/category/CategoryUpdateIdentityScript.js";
import { CategoryUpdateMediaScript } from "../scripts/category/CategoryUpdateMediaScript.js";
import { CategoryUpdateSeoScript } from "../scripts/category/CategoryUpdateSeoScript.js";
import { CategoryUpdateSortSectionScript } from "../scripts/category/CategoryUpdateSortSectionScript.js";
import { CategoryUpdateStatusScript } from "../scripts/category/CategoryUpdateStatusScript.js";
import type { UserError } from "../scripts/types/ScriptResult.js";
import type {
  CategoryChanges,
  CategorySectionChanges,
  CategoryUpdateParams,
  CategoryUpdateWorkflowInput,
  CategoryUpdateWorkflowResult,
  OperationResult,
  WorkflowContext,
} from "./dto/CategoryUpdateWorkflowDto.js";

@Injectable()
export class CategoryUpdateWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("catalog") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  private toScriptContext(ctx: WorkflowContext): RunScriptContext {
    return {
      storeId: ctx.storeId,
      organizationId: ctx.organizationId,
      locale: ctx.locale,
      userId: ctx.userId,
    };
  }

  @Workflow("categoryUpdate")
  async run(
    input: CategoryUpdateWorkflowInput,
  ): Promise<CategoryUpdateWorkflowResult> {
    const acquired = await this.stepAcquireRevision(
      input.categoryId,
      input.context.storeId,
      input.expectedRevision,
    );

    if ("error" in acquired) {
      return {
        category: null,
        operationResults: [],
        userErrors: [acquired.error],
      };
    }

    if (!hasRequestedSections(input.operations)) {
      return {
        category: { id: input.categoryId, revision: acquired.revision },
        operationResults: [],
        userErrors: [],
      };
    }

    const changes: CategoryChanges = { categoryId: input.categoryId };
    const result = await this.stepCategoryUpdate(
      input.categoryId,
      input.operations!,
      changes,
      this.toScriptContext(input.context),
    );

    if (changes.product?.categories) {
      const affectedProductIds = await this.stepGetAffectedProductIds(
        input.categoryId,
        input.context.storeId,
      );
      if (affectedProductIds.length > 0) {
        await this.workflowEmitProductUpdatedEvents(
          input,
          affectedProductIds,
          changes,
        );
      }
    }

    return {
      category: { id: input.categoryId, revision: acquired.revision },
      operationResults: [result],
      userErrors: result.errors,
    };
  }

  @WorkflowStep()
  private async stepAcquireRevision(
    categoryId: string,
    storeId: string,
    expectedRevision?: number,
  ): Promise<{ revision: number } | { error: UserError }> {
    const conditions = [
      eq(category.projectId, storeId),
      eq(category.id, categoryId),
      isNull(category.deletedAt),
    ];
    if (expectedRevision !== undefined) {
      conditions.push(eq(category.revision, expectedRevision));
    }

    const rows = await this.kernel.db
      .update(category)
      .set({
        revision: sql`${category.revision} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(and(...conditions))
      .returning({ id: category.id, revision: category.revision });

    if (rows[0]) {
      return { revision: rows[0].revision };
    }

    const exists = await this.kernel.db
      .select({ id: category.id })
      .from(category)
      .where(
        and(
          eq(category.projectId, storeId),
          eq(category.id, categoryId),
          isNull(category.deletedAt),
        ),
      )
      .limit(1)
      .then((result) => result.length > 0);

    return {
      error: exists
        ? {
            message: "Category was modified by another user",
            code: "REVISION_CONFLICT",
            field: ["expectedRevision"],
          }
        : {
            message: "Category not found",
            code: "NOT_FOUND",
            field: ["categoryId"],
          },
    };
  }

  @WorkflowStep()
  private async stepCategoryUpdate(
    categoryId: string,
    params: CategoryUpdateParams,
    changes: CategoryChanges,
    ctx: RunScriptContext,
  ): Promise<OperationResult> {
    const errors: UserError[] = [];

    if (params.handle !== undefined || params.name !== undefined) {
      const result = await this.kernel.runScript(
        CategoryUpdateIdentityScript,
        {
          categoryId,
          handle: params.handle,
          name: params.name,
        },
        ctx,
      );
      errors.push(...result.userErrors);
      mergeCategoryChanges(changes, result.changes);
    }

    if (
      params.content &&
      (params.content.description !== undefined ||
        params.content.excerpt !== undefined)
    ) {
      const result = await this.kernel.runScript(
        CategoryUpdateContentScript,
        {
          categoryId,
          description: params.content.description,
          excerpt: params.content.excerpt,
        },
        ctx,
      );
      errors.push(...result.userErrors);
      mergeCategoryChanges(changes, result.changes);
    }

    if (params.seo !== undefined) {
      const result = await this.kernel.runScript(
        CategoryUpdateSeoScript,
        { categoryId, seo: params.seo },
        ctx,
      );
      errors.push(...result.userErrors);
      mergeCategoryChanges(changes, result.changes);
    }

    if (params.status !== undefined) {
      const result = await this.kernel.runScript(
        CategoryUpdateStatusScript,
        { categoryId, status: params.status },
        ctx,
      );
      errors.push(...result.userErrors);
      mergeCategoryChanges(changes, result.changes);
    }

    if (params.media) {
      const result = await this.kernel.runScript(
        CategoryUpdateMediaScript,
        { categoryId, fileIds: params.media.fileIds },
        ctx,
      );
      errors.push(...result.userErrors);
      mergeCategoryChanges(changes, result.changes);
    }

    if (
      params.hierarchy &&
      Object.prototype.hasOwnProperty.call(params.hierarchy, "parentId")
    ) {
      const result = await this.kernel.runScript(
        CategoryUpdateHierarchyScript,
        { categoryId, parentId: params.hierarchy.parentId ?? null },
        ctx,
      );
      errors.push(...result.userErrors);
      mergeCategoryChanges(changes, result.changes);
    }

    if (params.sort) {
      const result = await this.kernel.runScript(
        CategoryUpdateSortSectionScript,
        {
          categoryId,
          defaultSort: params.sort.defaultSort,
          defaultSortDirection: params.sort.defaultSortDirection,
        },
        ctx,
      );
      errors.push(...result.userErrors);
      mergeCategoryChanges(changes, result.changes);
    }

    return {
      type: "categoryUpdate",
      applied: errors.length === 0,
      errors,
    };
  }

  @WorkflowStep()
  private async stepGetAffectedProductIds(
    categoryId: string,
    storeId: string,
  ): Promise<string[]> {
    const rows = await this.kernel.db
      .select({ productId: productCategory.productId })
      .from(productCategory)
      .where(
        and(
          eq(productCategory.projectId, storeId),
          eq(productCategory.categoryId, categoryId),
        ),
      );

    return rows.map((row) => row.productId);
  }

  private async workflowEmitProductUpdatedEvents(
    input: CategoryUpdateWorkflowInput,
    productIds: string[],
    changes: CategoryChanges,
  ): Promise<void> {
    const revisions = await this.getProductRevisions(
      productIds,
      input.context.storeId,
    );

    for (const productId of productIds) {
      await this.broker.runWorkflow(
        "events.emit",
        {
          eventType: "productUpdated",
          payload: {
            productId,
            storeId: input.context.storeId,
            revision: revisions.get(productId) ?? 0,
            product: changes.product,
          },
          source: "catalog",
          context: {
            tenantId: input.context.organizationId,
            userId: input.context.userId,
          },
          subject: { type: "product", id: productId },
          actor: input.context.userId
            ? { type: "user", id: input.context.userId }
            : undefined,
          emitKey: `product:${productId}`,
        },
        {
          source: "workflow",
          workflowId: DBOS.workflowID!,
          stepId: "emitCategoryProductUpdated",
          callId: `${input.categoryId}:${productId}`,
        },
      );
    }
  }

  @WorkflowStep()
  private async getProductRevisions(
    productIds: string[],
    storeId: string,
  ): Promise<Map<string, number>> {
    if (productIds.length === 0) return new Map();

    const rows = await this.kernel.db
      .select({ id: product.id, revision: product.revision })
      .from(product)
      .where(
        and(
          eq(product.projectId, storeId),
          inArray(product.id, productIds),
          isNull(product.deletedAt),
        ),
      );

    return new Map(rows.map((row) => [row.id, row.revision]));
  }
}

function hasRequestedSections(
  operations: CategoryUpdateWorkflowInput["operations"],
): operations is CategoryUpdateParams {
  if (!operations) return false;
  return (
    operations.handle !== undefined ||
    operations.name !== undefined ||
    (operations.content !== null &&
      operations.content !== undefined &&
      (operations.content.description !== undefined ||
        operations.content.excerpt !== undefined)) ||
    operations.seo !== undefined ||
    operations.status !== undefined ||
    operations.media !== undefined ||
    (operations.hierarchy !== null &&
      operations.hierarchy !== undefined &&
      Object.prototype.hasOwnProperty.call(operations.hierarchy, "parentId")) ||
    operations.sort !== undefined
  );
}

function mergeCategoryChanges(
  aggregate: CategoryChanges,
  changes: CategorySectionChanges | undefined,
): void {
  if (!changes?.categoryFields?.affectsProductIndex) return;

  aggregate.product = {
    ...aggregate.product,
    categories: {
      changed: true,
      reason: "categoryFields",
      categoryIds: [aggregate.categoryId],
    },
  };
}
