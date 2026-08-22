import { Injectable } from "@nestjs/common";
import {
  AggregateUpdateWorkflow,
  BrokerWorkflows,
  ChildWorkflowStep,
  DBOS,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
  WorkflowStep,
  type AggregateOperationPlanItem,
  type AggregateOperationRef,
  type AggregatePrevalidation,
  type DurableStepResult,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import {
  CategoryCreateScript,
  CategoryDeleteScript,
  CategoryMutationReadScript,
  CategoryRebalanceScript,
  CategoryUpdateContentScript,
  CategoryUpdateHierarchyScript,
  CategoryUpdateIdentityScript,
  CategoryUpdateMediaScript,
  CategoryUpdateSeoScript,
  CategoryUpdateSortSectionScript,
  CategoryUpdateStatusScript,
} from "../scripts/category/index.js";
import { CategoryComparisonProfileSetScript } from "../scripts/comparison/index.js";
import type { UserError } from "../scripts/types/ScriptResult.js";
import { TransactionalStep } from "./CatalogTransactionalStep.js";
import type {
  CategoryAuditChange,
  CategoryAuditOperation,
  CategoryChanges,
  CategoryCreateWorkflowInput,
  CategoryCreateWorkflowResult,
  CategoryDeleteWorkflowInput,
  CategoryDeleteWorkflowResult,
  CategoryFieldsParams,
  CategoryOperationResult,
  CategoryUpdateOperation,
  CategoryUpdateSectionResult,
  CategoryUpdateWorkflowInput,
  CategoryUpdateWorkflowResult,
  CategoryWorkflowContext,
} from "./dto/CategoryUpdateWorkflowDto.js";

interface CategoryPrevalidation extends AggregatePrevalidation {
  readonly categoryFound: boolean;
}

type CategoryOperationStepResult = DurableStepResult<CategoryOperationResult, CategoryChanges>;

abstract class CategoryMutationWorkflow<
  TInput extends { readonly context: CategoryWorkflowContext },
  TOutput,
> extends BrokerWorkflows<TInput, TOutput> {
  constructor(
    broker: ServiceBroker,
    protected readonly kernel: Kernel,
  ) {
    super(broker);
  }

  get transactionKernel(): Kernel {
    return this.kernel;
  }

  protected scriptContext(context: CategoryWorkflowContext): RunScriptContext {
    return {
      storeId: context.storeId,
      organizationId: context.organizationId,
      locale: context.locale,
      requestId: context.requestId,
      userId: context.userId,
    };
  }

  protected async read(
    query:
      | Readonly<{ type: "exists"; categoryId: string }>
      | Readonly<{ type: "handleOwner"; handle: string }>
      | Readonly<{ type: "directProfileId"; categoryId: string }>
      | Readonly<{ type: "affectedProductIds"; categoryId: string }>,
    context: RunScriptContext,
  ): Promise<boolean | string | null | readonly string[]> {
    const response = await this.kernel.runScript(CategoryMutationReadScript, query, context);
    if (response.type !== query.type)
      throw new Error("Category mutation read result type mismatch");
    return response.result;
  }
}

@Injectable()
export class CategoryCreateWorkflow extends CategoryMutationWorkflow<
  CategoryCreateWorkflowInput,
  CategoryCreateWorkflowResult
> {
  constructor(@InjectBroker("catalog") broker: ServiceBroker, kernel: Kernel) {
    super(broker, kernel);
  }

  @Workflow("categoryCreate")
  @Policy<CategoryCreateWorkflowInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(input: CategoryCreateWorkflowInput): Promise<CategoryCreateWorkflowResult> {
    const context = this.scriptContext(input.context);
    return this.kernel.runWithWorkflowContext(context, async () => {
      const validation = await this.prevalidate(input, context);
      if (validation.length > 0) return { category: null, userErrors: validation };

      const step = await this.stepCreate(input, context);
      if (!step.categoryId) return { category: null, userErrors: step.userErrors };

      await this.emitCreated(input, step.categoryId, step.auditOperation!);
      return { category: { id: step.categoryId }, userErrors: [] };
    });
  }

  @WorkflowStep()
  private async prevalidate(
    input: CategoryCreateWorkflowInput,
    context: RunScriptContext,
  ): Promise<readonly UserError[]> {
    const errors: UserError[] = [];
    const handleOwner = await this.read(
      { type: "handleOwner", handle: input.params.handle },
      context,
    );
    if (handleOwner !== null) {
      errors.push({
        message: "Category handle already exists",
        field: ["input", "handle"],
        code: "DUPLICATE_HANDLE",
      });
    }
    if (input.params.parentId) {
      const exists = await this.read(
        { type: "exists", categoryId: input.params.parentId },
        context,
      );
      if (!exists)
        errors.push({
          message: "Parent category not found",
          field: ["input", "parentId"],
          code: "MISSING_CATEGORY",
        });
    }
    return errors;
  }

  @TransactionalStep()
  private async stepCreate(input: CategoryCreateWorkflowInput, context: RunScriptContext) {
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
    return {
      categoryId: result.category.id,
      userErrors: result.userErrors,
      auditOperation: {
        position: 0,
        type: "categoryCreate",
        action: "CREATE" as const,
        target: { type: "category", id: result.category.id },
        changes: createAuditChanges(input),
      },
    };
  }

  @ChildWorkflowStep()
  private async emitCreated(
    input: CategoryCreateWorkflowInput,
    categoryId: string,
    operation: CategoryAuditOperation,
  ): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "categoryCreated",
        payload: {
          categoryId,
          storeId: input.context.storeId,
          audit: categoryAudit("CREATE", "categoryCreate", categoryId, input.context.storeId, [
            operation,
          ]),
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

@Injectable()
export class CategoryUpdateWorkflow extends AggregateUpdateWorkflow<
  CategoryUpdateWorkflowInput,
  CategoryUpdateOperation,
  CategoryOperationResult,
  CategoryChanges,
  CategoryUpdateWorkflowResult
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

  private scriptContext(context: CategoryWorkflowContext): RunScriptContext {
    return {
      storeId: context.storeId,
      organizationId: context.organizationId,
      locale: context.locale,
      requestId: context.requestId,
      userId: context.userId,
    };
  }

  @Workflow("categoryUpdate")
  @Policy<CategoryUpdateWorkflowInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(input: CategoryUpdateWorkflowInput): Promise<CategoryUpdateWorkflowResult> {
    const context = this.scriptContext(input.context);
    return this.kernel.runWithWorkflowContext(context, () => this.executeAggregateUpdate(input));
  }

  protected operations(input: CategoryUpdateWorkflowInput): readonly CategoryUpdateOperation[] {
    return input.operations;
  }

  protected async prevalidateAggregate(
    input: CategoryUpdateWorkflowInput,
  ): Promise<CategoryPrevalidation> {
    const context = this.scriptContext(input.context);
    return this.stepPrevalidate(input, context);
  }

  @WorkflowStep()
  private async stepPrevalidate(
    input: CategoryUpdateWorkflowInput,
    context: RunScriptContext,
  ): Promise<CategoryPrevalidation> {
    const existsResponse = await this.kernel.runScript(
      CategoryMutationReadScript,
      { type: "exists", categoryId: input.categoryId },
      context,
    );
    if (existsResponse.type !== "exists")
      throw new Error("Category mutation read result type mismatch");
    if (!existsResponse.result) {
      return {
        valid: false,
        categoryFound: false,
        errorsByOperationIndex: {},
        userErrors: [{ message: "Category not found", field: ["categoryId"], code: "NOT_FOUND" }],
      };
    }

    const errorsByOperationIndex: Record<number, UserError[]> = {};
    const userErrors: UserError[] = [];
    for (const [index, operation] of input.operations.entries()) {
      if (operation.type !== "categoryUpdate" || operation.params.handle === undefined) continue;
      const ownerResponse = await this.kernel.runScript(
        CategoryMutationReadScript,
        { type: "handleOwner", handle: operation.params.handle },
        context,
      );
      if (ownerResponse.type !== "handleOwner")
        throw new Error("Category mutation read result type mismatch");
      if (ownerResponse.result && ownerResponse.result !== input.categoryId) {
        const error = {
          message: "Category handle already exists",
          field: [...operation.meta.fieldPrefix, "handle"],
          code: "DUPLICATE_HANDLE",
        };
        errorsByOperationIndex[index] = [error];
        userErrors.push(error);
      }
    }
    return {
      valid: userErrors.length === 0,
      categoryFound: true,
      errorsByOperationIndex,
      userErrors,
    };
  }

  protected planOperations(
    operations: readonly AggregateOperationRef<CategoryUpdateOperation>[],
  ): readonly AggregateOperationPlanItem[] {
    return operations.map(({ position }) => ({ positions: [position] }));
  }

  protected async applyPlanItem(
    input: CategoryUpdateWorkflowInput,
    item: AggregateOperationPlanItem,
  ): Promise<ReadonlyMap<number, CategoryOperationStepResult>> {
    if (item.positions.length !== 1)
      throw new Error("Category operations are applied independently");
    const position = item.positions[0]!;
    const operation = input.operations[position]!;
    const context = this.scriptContext(input.context);
    const result = await this.applyOperation(input.categoryId, operation, position, context);
    return new Map([[position, result]]);
  }

  private applyOperation(
    categoryId: string,
    operation: CategoryUpdateOperation,
    position: number,
    context: RunScriptContext,
  ): Promise<CategoryOperationStepResult> {
    switch (operation.type) {
      case "categoryUpdate":
        return this.stepUpdateFields(categoryId, operation, position, context);
      case "categoryHierarchyMove":
        return this.stepMove(categoryId, operation, position, context);
      case "categoryHierarchyRebalance":
        return this.stepRebalance(categoryId, operation, position, context);
      case "categoryComparisonProfileSet":
        return this.stepSetComparisonProfile(categoryId, operation, position, context);
      default:
        return assertNever(operation);
    }
  }

  @TransactionalStep()
  private async stepUpdateFields(
    categoryId: string,
    operation: Extract<CategoryUpdateOperation, { type: "categoryUpdate" }>,
    position: number,
    context: RunScriptContext,
  ): Promise<CategoryOperationStepResult> {
    const params = operation.params;
    const errors: UserError[] = [];
    const auditChanges: CategoryAuditChange[] = [];
    let affectsProductIndex = false;
    let changed = false;

    const collect = (result: CategoryUpdateSectionResult, paths: readonly string[]) => {
      const mappedErrors = prefixErrors(result.userErrors, operation.meta.fieldPrefix);
      errors.push(...mappedErrors);
      if (!result.changes) return;
      changed = true;
      affectsProductIndex ||= result.changes.categoryFields?.affectsProductIndex === true;
      const changedPaths = result.changes.categoryFields?.changedPaths ?? paths;
      auditChanges.push(...changedPaths.map((path) => omittedSet(path)));
    };

    if (params.handle !== undefined || params.name !== undefined) {
      collect(
        await this.kernel.runScript(
          CategoryUpdateIdentityScript,
          { categoryId, handle: params.handle, name: params.name },
          context,
        ),
        [
          params.handle !== undefined ? "fields.handle" : null,
          params.name !== undefined ? "fields.name" : null,
        ].filter(isString),
      );
    }
    if (params.content) {
      collect(
        await this.kernel.runScript(
          CategoryUpdateContentScript,
          { categoryId, ...params.content },
          context,
        ),
        [
          params.content.description !== undefined ? "fields.content.description" : null,
          params.content.excerpt !== undefined ? "fields.content.excerpt" : null,
        ].filter(isString),
      );
    }
    if (params.seo !== undefined) {
      collect(
        await this.kernel.runScript(
          CategoryUpdateSeoScript,
          { categoryId, seo: params.seo },
          context,
        ),
        ["fields.seo"],
      );
    }
    if (params.status !== undefined) {
      collect(
        await this.kernel.runScript(
          CategoryUpdateStatusScript,
          { categoryId, status: params.status },
          context,
        ),
        ["fields.status"],
      );
    }
    if (params.media) {
      collect(
        await this.kernel.runScript(
          CategoryUpdateMediaScript,
          { categoryId, fileIds: [...params.media.fileIds] },
          context,
        ),
        ["fields.media"],
      );
    }
    if (params.sort) {
      collect(
        await this.kernel.runScript(
          CategoryUpdateSortSectionScript,
          { categoryId, ...params.sort },
          context,
        ),
        ["fields.sort"],
      );
    }

    assertNoPostWriteErrors(errors, changed, operation.type);
    return {
      result: { type: operation.type, applied: errors.length === 0, errors },
      changes: {
        categoryId,
        affectedProductIds: affectsProductIndex
          ? await this.affectedProductIds(categoryId, context)
          : [],
        auditOperations:
          changed && errors.length === 0
            ? [{ position, type: operation.type, action: "UPDATE", changes: auditChanges }]
            : [],
      },
    };
  }

  @TransactionalStep()
  private async stepMove(
    categoryId: string,
    operation: Extract<CategoryUpdateOperation, { type: "categoryHierarchyMove" }>,
    position: number,
    context: RunScriptContext,
  ): Promise<CategoryOperationStepResult> {
    const result = await this.kernel.runScript(
      CategoryUpdateHierarchyScript,
      { categoryId, parentId: operation.params.parentId },
      context,
    );
    const errors = prefixErrors(result.userErrors, operation.meta.fieldPrefix);
    const changed = result.changes !== undefined && errors.length === 0;
    return {
      result: { type: operation.type, applied: errors.length === 0, errors },
      changes: {
        categoryId,
        affectedProductIds: [],
        auditOperations: changed
          ? [
              {
                position,
                type: operation.type,
                action: "MOVE",
                changes: [
                  {
                    path: "hierarchy.parentId",
                    kind: "MOVE",
                    after: visible(operation.params.parentId),
                  },
                ],
              },
            ]
          : [],
      },
    };
  }

  @TransactionalStep()
  private async stepRebalance(
    categoryId: string,
    operation: Extract<CategoryUpdateOperation, { type: "categoryHierarchyRebalance" }>,
    position: number,
    context: RunScriptContext,
  ): Promise<CategoryOperationStepResult> {
    const result = await this.kernel.runScript(CategoryRebalanceScript, { categoryId }, context);
    const errors = prefixErrors(result.userErrors, operation.meta.fieldPrefix);
    const changed = result.changed && errors.length === 0;
    return {
      result: { type: operation.type, applied: errors.length === 0, errors },
      changes: {
        categoryId,
        affectedProductIds: changed ? [...result.affectedProductIds] : [],
        auditOperations: changed
          ? [
              {
                position,
                type: operation.type,
                action: "MOVE",
                changes: [{ path: "products.rank", kind: "MOVE" }],
              },
            ]
          : [],
      },
    };
  }

  @TransactionalStep()
  private async stepSetComparisonProfile(
    categoryId: string,
    operation: Extract<CategoryUpdateOperation, { type: "categoryComparisonProfileSet" }>,
    position: number,
    context: RunScriptContext,
  ): Promise<CategoryOperationStepResult> {
    const currentResponse = await this.kernel.runScript(
      CategoryMutationReadScript,
      { type: "directProfileId", categoryId },
      context,
    );
    if (currentResponse.type !== "directProfileId")
      throw new Error("Category mutation read result type mismatch");
    if (currentResponse.result === operation.params.profileId) {
      return {
        result: {
          type: operation.type,
          applied: true,
          entityId: operation.params.profileId ?? undefined,
          errors: [],
        },
        changes: { categoryId, affectedProductIds: [], auditOperations: [] },
      };
    }
    const result = await this.kernel.runScript(
      CategoryComparisonProfileSetScript,
      { categoryId, profileId: operation.params.profileId },
      context,
    );
    const errors = prefixErrors(result.userErrors, operation.meta.fieldPrefix);
    return {
      result: {
        type: operation.type,
        applied: errors.length === 0,
        entityId: operation.params.profileId ?? undefined,
        errors,
      },
      changes: {
        categoryId,
        affectedProductIds: [],
        auditOperations:
          errors.length === 0
            ? [
                {
                  position,
                  type: operation.type,
                  action: operation.params.profileId ? "LINK" : "UNLINK",
                  target: operation.params.profileId
                    ? { type: "comparisonProfile", id: operation.params.profileId }
                    : undefined,
                  changes: [
                    {
                      path: "comparisonProfile",
                      kind: "SET",
                      after: visible(operation.params.profileId),
                    },
                  ],
                },
              ]
            : [],
      },
    };
  }

  private async affectedProductIds(
    categoryId: string,
    context: RunScriptContext,
  ): Promise<string[]> {
    const response = await this.kernel.runScript(
      CategoryMutationReadScript,
      { type: "affectedProductIds", categoryId },
      context,
    );
    if (response.type !== "affectedProductIds")
      throw new Error("Category mutation read result type mismatch");
    return [...response.result];
  }

  protected mergeChanges(target: CategoryChanges, source: CategoryChanges | null): void {
    if (!source) return;
    target.auditOperations = [...target.auditOperations, ...source.auditOperations];
    target.affectedProductIds = [
      ...new Set([...target.affectedProductIds, ...source.affectedProductIds]),
    ];
  }

  protected initialChanges(input: CategoryUpdateWorkflowInput): CategoryChanges {
    return { categoryId: input.categoryId, auditOperations: [], affectedProductIds: [] };
  }

  protected hasActualChanges(changes: CategoryChanges): boolean {
    return changes.auditOperations.length > 0;
  }

  protected prevalidationFailure(
    input: CategoryUpdateWorkflowInput,
    validation: AggregatePrevalidation,
  ): CategoryUpdateWorkflowResult {
    const categoryFound = (validation as CategoryPrevalidation).categoryFound;
    const operationResults: readonly CategoryOperationResult[] = categoryFound
      ? input.operations.map((operation, index) => ({
          type: operation.type,
          applied: false,
          errors: (validation.errorsByOperationIndex[index] as
            readonly UserError[] | undefined) ?? [
            {
              message: "Category update prevalidation failed",
              field: [...operation.meta.fieldPrefix],
              code: "PREVALIDATION_FAILED",
            },
          ],
        }))
      : [];
    return {
      category: categoryFound ? { id: input.categoryId } : null,
      operationResults,
      userErrors: categoryFound
        ? operationResults.flatMap((result) => result.errors)
        : (validation.userErrors as readonly UserError[]),
    };
  }

  protected async successResult(
    input: CategoryUpdateWorkflowInput,
    results: readonly CategoryOperationResult[],
    changes: CategoryChanges,
  ): Promise<CategoryUpdateWorkflowResult> {
    if (this.hasActualChanges(changes)) {
      await this.emitUpdated(input, changes);
      await this.emitAffectedProductEvents(input, changes.affectedProductIds);
    }
    return {
      category: { id: input.categoryId },
      operationResults: results,
      userErrors: results.flatMap((result) => result.errors),
    };
  }

  @ChildWorkflowStep()
  private async emitUpdated(
    input: CategoryUpdateWorkflowInput,
    changes: CategoryChanges,
  ): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "categoryUpdated",
        payload: {
          categoryId: input.categoryId,
          storeId: input.context.storeId,
          audit: {
            kind: "aggregate-mutation",
            schemaVersion: 1,
            storeId: input.context.storeId,
            action: "UPDATE",
            command: "categoryUpdate",
            aggregate: { type: "category", id: input.categoryId },
            operations: changes.auditOperations,
          },
        },
        context: { organizationId: input.context.organizationId, userId: input.context.userId },
        subject: { type: "category", id: input.categoryId },
        actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
        emitKey: `category:${input.categoryId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitCategoryUpdated",
        callId: input.categoryId,
        organizationId: input.context.organizationId,
      },
    );
  }

  @ChildWorkflowStep()
  private async emitAffectedProductEvents(
    input: CategoryUpdateWorkflowInput,
    productIds: readonly string[],
  ): Promise<void> {
    for (const productId of productIds) {
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
          stepId: "emitCategoryProductUpdated",
          callId: `${input.categoryId}:${productId}`,
          organizationId: input.context.organizationId,
        },
      );
    }
  }
}

@Injectable()
export class CategoryDeleteWorkflow extends CategoryMutationWorkflow<
  CategoryDeleteWorkflowInput,
  CategoryDeleteWorkflowResult
> {
  constructor(@InjectBroker("catalog") broker: ServiceBroker, kernel: Kernel) {
    super(broker, kernel);
  }

  @Workflow("categoryDelete")
  @Policy<CategoryDeleteWorkflowInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(input: CategoryDeleteWorkflowInput): Promise<CategoryDeleteWorkflowResult> {
    const context = this.scriptContext(input.context);
    return this.kernel.runWithWorkflowContext(context, async () => {
      const exists = await this.prevalidate(input.categoryId, context);
      if (!exists)
        return {
          deletedCategoryId: null,
          userErrors: [{ message: "Category not found", field: ["categoryId"], code: "NOT_FOUND" }],
        };
      const result = await this.stepDelete(input, context);
      if (!result.deletedCategoryId)
        return { deletedCategoryId: null, userErrors: result.userErrors };
      await this.emitDeleted(input, result.deletedCategoryId, result.auditOperation!);
      await this.emitAffectedProductEvents(input, result.affectedProductIds);
      return { deletedCategoryId: result.deletedCategoryId, userErrors: [] };
    });
  }

  @WorkflowStep()
  private async prevalidate(categoryId: string, context: RunScriptContext): Promise<boolean> {
    return (await this.read({ type: "exists", categoryId }, context)) === true;
  }

  @TransactionalStep()
  private async stepDelete(input: CategoryDeleteWorkflowInput, context: RunScriptContext) {
    const affectedProductsResponse = await this.kernel.runScript(
      CategoryMutationReadScript,
      { type: "affectedProductIds", categoryId: input.categoryId },
      context,
    );
    if (affectedProductsResponse.type !== "affectedProductIds") {
      throw new Error("Category mutation read result type mismatch");
    }
    const result = await this.kernel.runScript(
      CategoryDeleteScript,
      { id: input.categoryId, permanent: input.permanent },
      context,
    );
    return {
      deletedCategoryId: result.deletedCategoryId ?? null,
      affectedProductIds: [...affectedProductsResponse.result],
      userErrors: result.userErrors,
      auditOperation: result.deletedCategoryId
        ? {
            position: 0,
            type: "categoryDelete",
            action: "DELETE" as const,
            target: { type: "category", id: result.deletedCategoryId },
            changes: [
              { path: "category", kind: "REMOVE" as const, before: { state: "OMITTED" as const } },
            ],
          }
        : null,
    };
  }

  @ChildWorkflowStep()
  private async emitDeleted(
    input: CategoryDeleteWorkflowInput,
    categoryId: string,
    operation: CategoryAuditOperation,
  ): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "categoryDeleted",
        payload: {
          categoryId,
          storeId: input.context.storeId,
          audit: categoryAudit("DELETE", "categoryDelete", categoryId, input.context.storeId, [
            operation,
          ]),
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
    input: CategoryDeleteWorkflowInput,
    productIds: readonly string[],
  ): Promise<void> {
    for (const productId of productIds) {
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
}

function categoryAudit(
  action: "CREATE" | "DELETE",
  command: "categoryCreate" | "categoryDelete",
  categoryId: string,
  storeId: string,
  operations: readonly CategoryAuditOperation[],
) {
  return {
    kind: "aggregate-mutation" as const,
    schemaVersion: 1 as const,
    storeId,
    action,
    command,
    aggregate: { type: "category", id: categoryId },
    operations,
  };
}

function createAuditChanges(input: CategoryCreateWorkflowInput): CategoryAuditChange[] {
  const changes: CategoryAuditChange[] = [
    { path: "handle", kind: "SET", after: visible(input.params.handle) },
    { path: "name", kind: "SET", after: { state: "OMITTED" } },
  ];
  if (input.params.parentId !== undefined)
    changes.push({ path: "parentId", kind: "SET", after: visible(input.params.parentId) });
  if (input.params.publish !== undefined)
    changes.push({ path: "published", kind: "SET", after: visible(input.params.publish) });
  if (input.params.description !== undefined) changes.push(omittedSet("description"));
  if (input.params.excerpt !== undefined) changes.push(omittedSet("excerpt"));
  if (input.params.seo !== undefined) changes.push(omittedSet("seo"));
  if (input.params.mediaFileIds !== undefined) changes.push(omittedSet("media"));
  return changes;
}

function visible(value: unknown) {
  return { state: "VISIBLE" as const, value };
}

function omittedSet(path: string): CategoryAuditChange {
  return { path, kind: "SET", after: { state: "OMITTED" } };
}

function prefixErrors(errors: readonly UserError[], prefix: readonly string[]): UserError[] {
  return errors.map((error) => ({
    ...error,
    field:
      error.field?.[0] === "operations"
        ? [...prefix, ...error.field.slice(error.field[1] === prefix[1] ? 2 : 1)]
        : [...prefix, ...(error.field ?? [])],
  }));
}

function assertNoPostWriteErrors(
  errors: readonly UserError[],
  changed: boolean,
  operation: string,
): void {
  if (changed && errors.length > 0)
    throw new Error(`${operation} returned a business error after a write`);
}

function isString(value: string | null): value is string {
  return value !== null;
}

function assertNever(value: never): never {
  throw new Error(`Unsupported category update operation: ${JSON.stringify(value)}`);
}
