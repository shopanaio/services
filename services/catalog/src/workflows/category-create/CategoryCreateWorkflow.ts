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
import type { UserError } from "../../scripts/types/ScriptResult.js";
import { TransactionalStep } from "../CatalogTransactionalStep.js";
import { CategoryCreateScript, CategoryCreateReadScript } from "./scripts/index.js";
import type {
  CategoryCreateAuditChange,
  CategoryCreateAuditOperation,
  CategoryCreateInput,
  CategoryCreateResult,
} from "./dto/index.js";

@Injectable()
export class CategoryCreateWorkflow extends BrokerWorkflows<
  CategoryCreateInput,
  CategoryCreateResult
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

  @Workflow("categoryCreate")
  @Policy<CategoryCreateInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  run(input: CategoryCreateInput): Promise<CategoryCreateResult> {
    const context: RunScriptContext = { ...input.context };
    return this.kernel.runWithWorkflowContext(context, async () => {
      const validation = await this.prevalidate(input, context);
      if (validation.length > 0) return { category: null, userErrors: validation };
      const step = await this.createCategory(input, context);
      if (!step.categoryId) return { category: null, userErrors: step.userErrors };
      await this.emitCategoryCreated(input, step.categoryId, step.auditOperation!);
      return { category: { id: step.categoryId }, userErrors: [] };
    });
  }

  @WorkflowStep()
  private async prevalidate(
    input: CategoryCreateInput,
    context: RunScriptContext,
  ): Promise<readonly UserError[]> {
    const errors: UserError[] = [];
    const handle = await this.kernel.runScript(
      CategoryCreateReadScript,
      { type: "handleOwner", handle: input.params.handle },
      context,
    );
    if (handle.type !== "handleOwner")
      throw new Error("Category mutation read result type mismatch");
    if (handle.result !== null)
      errors.push({
        message: "Category handle already exists",
        field: ["input", "handle"],
        code: "DUPLICATE_HANDLE",
      });
    if (input.params.parentId) {
      const parent = await this.kernel.runScript(
        CategoryCreateReadScript,
        { type: "exists", categoryId: input.params.parentId },
        context,
      );
      if (parent.type !== "exists") throw new Error("Category mutation read result type mismatch");
      if (!parent.result)
        errors.push({
          message: "Parent category not found",
          field: ["input", "parentId"],
          code: "MISSING_CATEGORY",
        });
    }
    return errors;
  }

  @TransactionalStep()
  private async createCategory(input: CategoryCreateInput, context: RunScriptContext) {
    const result = await this.kernel.runScript(
      CategoryCreateScript,
      {
        ...input.params,
        mediaFileIds: input.params.mediaFileIds ? [...input.params.mediaFileIds] : undefined,
      },
      context,
    );
    if (!result.category)
      return { categoryId: null, userErrors: result.userErrors, auditOperation: null };
    const auditOperation: CategoryCreateAuditOperation = {
      position: 0,
      type: "categoryCreate",
      action: "CREATE",
      target: { type: "category", id: result.category.id },
      changes: createAuditChanges(input),
    };
    return { categoryId: result.category.id, userErrors: result.userErrors, auditOperation };
  }

  @ChildWorkflowStep()
  private async emitCategoryCreated(
    input: CategoryCreateInput,
    categoryId: string,
    operation: CategoryCreateAuditOperation,
  ): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "categoryCreated",
        payload: {
          categoryId,
          storeId: input.context.storeId,
          audit: {
            kind: "aggregate-mutation",
            schemaVersion: 1,
            storeId: input.context.storeId,
            action: "CREATE",
            command: "categoryCreate",
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
        stepId: "emitCategoryCreated",
        callId: categoryId,
        organizationId: input.context.organizationId,
      },
    );
  }
}
function createAuditChanges(input: CategoryCreateInput): CategoryCreateAuditChange[] {
  const changes: CategoryCreateAuditChange[] = [
    { path: "handle", kind: "SET", after: visible(input.params.handle) },
    { path: "name", kind: "SET", after: { state: "OMITTED" } },
  ];
  if (input.params.parentId !== undefined)
    changes.push({ path: "parentId", kind: "SET", after: visible(input.params.parentId) });
  if (input.params.publish !== undefined)
    changes.push({ path: "published", kind: "SET", after: visible(input.params.publish) });
  for (const path of ["description", "excerpt", "seo", "media"] as const) {
    const present =
      path === "media" ? input.params.mediaFileIds !== undefined : input.params[path] !== undefined;
    if (present) changes.push({ path, kind: "SET", after: { state: "OMITTED" } });
  }
  return changes;
}
function visible(value: unknown) {
  return { state: "VISIBLE" as const, value };
}
