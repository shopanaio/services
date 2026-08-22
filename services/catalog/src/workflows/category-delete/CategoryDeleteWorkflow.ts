import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  ChildWorkflowStep,
  DBOS,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { Kernel } from "../../kernel/Kernel.js";
import type { RunScriptContext } from "../../kernel/types.js";
import { TransactionalStep } from "../CatalogTransactionalStep.js";
import { CategoryDeleteScript, CategoryDeleteReadScript } from "./scripts/index.js";
import type {
  CategoryDeleteAuditOperation,
  CategoryDeleteInput,
  CategoryDeleteResult,
} from "./dto/index.js";

@Injectable()
export class CategoryDeleteWorkflow extends BrokerWorkflows<
  CategoryDeleteInput,
  CategoryDeleteResult
> {
  constructor(
    @InjectBroker("catalog") broker: ServiceBroker,
    private readonly kernel: Kernel,
  ) {
    super(broker);
  }
  get transactionKernel(): Kernel {
    return this.kernel;
  }

  @Workflow("categoryDelete")
  @Policy<CategoryDeleteInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  run(input: CategoryDeleteInput): Promise<CategoryDeleteResult> {
    const context: RunScriptContext = { ...input.context };
    return this.kernel.runWithWorkflowContext(context, async () => {
      if (!(await this.categoryExists(input.categoryId, context)))
        return {
          deletedCategoryId: null,
          userErrors: [{ message: "Category not found", field: ["categoryId"], code: "NOT_FOUND" }],
        };
      const result = await this.deleteCategory(input, context);
      if (!result.deletedCategoryId)
        return { deletedCategoryId: null, userErrors: result.userErrors };
      await this.emitCategoryDeleted(input, result.deletedCategoryId, result.auditOperation!);
      await this.emitAffectedProductEvents(input, result.affectedProductIds);
      return { deletedCategoryId: result.deletedCategoryId, userErrors: [] };
    });
  }

  @WorkflowStep()
  private async categoryExists(categoryId: string, context: RunScriptContext): Promise<boolean> {
    const result = await this.kernel.runScript(
      CategoryDeleteReadScript,
      { type: "exists", categoryId },
      context,
    );
    if (result.type !== "exists") throw new Error("Category mutation read result type mismatch");
    return result.result;
  }

  @TransactionalStep()
  private async deleteCategory(input: CategoryDeleteInput, context: RunScriptContext) {
    const affected = await this.kernel.runScript(
      CategoryDeleteReadScript,
      { type: "affectedProductIds", categoryId: input.categoryId },
      context,
    );
    if (affected.type !== "affectedProductIds")
      throw new Error("Category mutation read result type mismatch");
    const result = await this.kernel.runScript(
      CategoryDeleteScript,
      { id: input.categoryId, permanent: input.permanent },
      context,
    );
    const auditOperation: CategoryDeleteAuditOperation | null = result.deletedCategoryId
      ? {
          position: 0,
          type: "categoryDelete",
          action: "DELETE",
          target: { type: "category", id: result.deletedCategoryId },
          changes: [{ path: "category", kind: "REMOVE", before: { state: "OMITTED" } }],
        }
      : null;
    return {
      deletedCategoryId: result.deletedCategoryId ?? null,
      affectedProductIds: [...affected.result],
      userErrors: result.userErrors,
      auditOperation,
    };
  }

  @ChildWorkflowStep()
  private async emitCategoryDeleted(
    input: CategoryDeleteInput,
    categoryId: string,
    operation: CategoryDeleteAuditOperation,
  ): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "categoryDeleted",
        payload: {
          categoryId,
          storeId: input.context.storeId,
          audit: {
            kind: "aggregate-mutation",
            schemaVersion: 1,
            storeId: input.context.storeId,
            action: "DELETE",
            command: "categoryDelete",
            aggregate: { type: "category", id: categoryId },
            operations: [operation],
          },
        },
        context: { organizationId: input.context.organizationId, userId: input.context.userId },
        subject: { type: "category", id: categoryId },
        actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
        emitKey: `category:${categoryId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitCategoryDeleted",
        callId: categoryId,
        organizationId: input.context.organizationId,
      },
    );
  }

  @ChildWorkflowStep()
  private async emitAffectedProductEvents(
    input: CategoryDeleteInput,
    productIds: readonly string[],
  ): Promise<void> {
    for (const productId of productIds)
      await this.broker.runWorkflow(
        "events.emit",
        {
          eventType: "productUpdated",
          payload: { productId, storeId: input.context.storeId, reasons: ["category"] },
          context: { organizationId: input.context.organizationId, userId: input.context.userId },
          subject: { type: "product", id: productId },
          actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
          emitKey: `product:${productId}`,
        },
        {
          source: "workflow",
          workflowId: DBOS.workflowID!,
          stepId: "emitCategoryDeletedProductUpdated",
          callId: `${input.categoryId}:${productId}`,
          organizationId: input.context.organizationId,
        },
      );
  }
}
