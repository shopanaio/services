import { Injectable } from "@nestjs/common";
import {
  AggregateUpdateWorkflow,
  ChildWorkflowStep,
  DBOS,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
  type AggregateOperationPlanItem,
  type AggregateOperationRef,
  type AggregatePrevalidation,
  type DurableStepResult,
} from "@shopana/shared-kernel";
import type { CollectionUpdatedReason } from "@shopana/events";
import { Kernel } from "../../kernel/Kernel.js";
import type { UserError } from "../../kernel/BaseScript.js";
import type { RunScriptContext } from "../../kernel/types.js";
import {
  CollectionAddProductsScript,
  CollectionClearProductsScript,
  CollectionMoveProductScript,
  CollectionRebalanceScript,
  CollectionRemoveProductsScript,
  CollectionUpdateRulesScript,
  CollectionUpdateScript,
} from "./scripts/index.js";
import { TransactionalStep } from "../CatalogTransactionalStep.js";
import type {
  CollectionOperationResult,
  CollectionUpdateOperation,
  CollectionUpdateWorkflowInput,
  CollectionUpdateWorkflowResult,
  CollectionWorkflowContext,
} from "./dto/index.js";
interface CollectionAuditOperation {
  readonly position: number;
  readonly type: string;
  readonly action: "CREATE" | "UPDATE" | "DELETE" | "MOVE" | "LINK" | "UNLINK";
  readonly target?: Readonly<{ type: string; id: string }>;
  readonly changes: readonly Readonly<{
    path: string;
    kind: "SET" | "ADD" | "REMOVE" | "MOVE";
  }>[];
}

interface CollectionChanges {
  auditOperations: CollectionAuditOperation[];
  reasons: CollectionUpdatedReason[];
  syncOperations: Array<{ operationId: string; collectionId: string }>;
}

type CollectionStepResult = DurableStepResult<CollectionOperationResult, CollectionChanges>;
@Injectable()
export class CollectionUpdateWorkflow extends AggregateUpdateWorkflow<
  CollectionUpdateWorkflowInput,
  CollectionUpdateOperation,
  CollectionOperationResult,
  CollectionChanges,
  CollectionUpdateWorkflowResult
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

  @Workflow("collectionUpdate")
  @Policy<CollectionUpdateWorkflowInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  run(input: CollectionUpdateWorkflowInput): Promise<CollectionUpdateWorkflowResult> {
    const context = collectionScriptContext(input.context);
    return this.kernel.runWithWorkflowContext(context, () => this.executeAggregateUpdate(input));
  }

  protected operations(input: CollectionUpdateWorkflowInput): readonly CollectionUpdateOperation[] {
    return input.operations;
  }

  protected prevalidateAggregate(
    input: CollectionUpdateWorkflowInput,
  ): Promise<AggregatePrevalidation> {
    const errorsByOperationIndex: Record<number, readonly UserError[]> = {};
    const userErrors: UserError[] = [];
    input.operations.forEach((operation, position) => {
      if (operationCollectionId(operation) !== input.collectionId) {
        const error: UserError = {
          message: "Operation does not belong to the requested collection",
          field: [...operation.meta.fieldPrefix],
          code: "INVALID_OPERATION",
        };
        errorsByOperationIndex[position] = [error];
        userErrors.push(error);
      }
    });
    return Promise.resolve({
      valid: userErrors.length === 0,
      errorsByOperationIndex,
      userErrors,
    });
  }

  protected planOperations(
    operations: readonly AggregateOperationRef<CollectionUpdateOperation>[],
  ): readonly AggregateOperationPlanItem[] {
    return operations.map(({ position }) => ({ positions: [position] }));
  }

  protected async applyPlanItem(
    input: CollectionUpdateWorkflowInput,
    item: AggregateOperationPlanItem,
  ): Promise<ReadonlyMap<number, CollectionStepResult>> {
    if (item.positions.length !== 1) throw new Error("Collection operations apply independently");
    const position = item.positions[0]!;
    const result = await this.applyOperation(
      input.operations[position]!,
      position,
      collectionScriptContext(input.context),
    );
    return new Map([[position, result]]);
  }

  @TransactionalStep()
  private async applyOperation(
    operation: CollectionUpdateOperation,
    position: number,
    context: RunScriptContext,
  ): Promise<CollectionStepResult> {
    const result = await runCollectionOperation(this.kernel, operation, context);
    const errors = prefixCollectionErrors(result.userErrors, operation.meta.fieldPrefix);
    const applied = errors.length === 0 && result.collection?.id !== undefined;
    return {
      result: {
        type: operation.type,
        applied,
        entityId: applied ? operationEntityId(operation) : undefined,
        errors,
      },
      changes: applied
        ? {
            auditOperations: [collectionOperationAudit(operation, position)],
            reasons: collectionOperationReasons(operation),
            syncOperations: result.syncOperationId
              ? [{ operationId: result.syncOperationId, collectionId: result.collection!.id }]
              : [],
          }
        : null,
    };
  }

  protected initialChanges(): CollectionChanges {
    return { auditOperations: [], reasons: [], syncOperations: [] };
  }

  protected mergeChanges(target: CollectionChanges, source: CollectionChanges | null): void {
    if (!source) return;
    target.auditOperations.push(...source.auditOperations);
    target.reasons = [...new Set([...target.reasons, ...source.reasons])];
    target.syncOperations.push(...source.syncOperations);
  }

  protected hasActualChanges(changes: CollectionChanges): boolean {
    return changes.auditOperations.length > 0;
  }

  protected prevalidationFailure(
    input: CollectionUpdateWorkflowInput,
    validation: AggregatePrevalidation,
  ): CollectionUpdateWorkflowResult {
    return {
      collection: null,
      operationResults: input.operations.map((operation, position) => ({
        type: operation.type,
        applied: false,
        errors: (validation.errorsByOperationIndex[position] ??
          validation.userErrors) as UserError[],
      })),
      userErrors: validation.userErrors as UserError[],
    };
  }

  protected async successResult(
    input: CollectionUpdateWorkflowInput,
    results: readonly CollectionOperationResult[],
    changes: CollectionChanges,
  ): Promise<CollectionUpdateWorkflowResult> {
    if (this.hasActualChanges(changes)) {
      await this.emitUpdated(input, changes);
      for (const sync of changes.syncOperations) await this.startProductSync(input, sync);
    }
    return {
      collection: results.some((result) => result.applied) ? { id: input.collectionId } : null,
      operationResults: results,
      userErrors: results.flatMap((result) => result.errors),
    };
  }

  @ChildWorkflowStep()
  private async emitUpdated(
    input: CollectionUpdateWorkflowInput,
    changes: CollectionChanges,
  ): Promise<void> {
    await emitCollectionLifecycle(
      this.broker,
      input.context,
      input.collectionId,
      "UPDATE",
      "collectionUpdate",
      changes.auditOperations,
      changes.reasons,
    );
  }

  @ChildWorkflowStep()
  private async startProductSync(
    input: CollectionUpdateWorkflowInput,
    sync: { operationId: string; collectionId: string },
  ): Promise<void> {
    await this.broker.startWorkflow(
      "catalog.collectionProductSync",
      { ...sync, context: input.context },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "startCollectionProductSync",
        callId: sync.operationId,
        organizationId: input.context.organizationId,
      },
      {
        queueName: "catalog_collection_product_sync",
        enqueueOptions: {
          queuePartitionKey: `${input.context.storeId}:collection:${input.collectionId}`,
        },
        timeoutMS: 600_000,
      },
    );
  }
}

function runCollectionOperation(
  kernel: Kernel,
  operation: CollectionUpdateOperation,
  context: RunScriptContext,
) {
  switch (operation.type) {
    case "collectionFieldsUpdate":
      return kernel.runScript(CollectionUpdateScript, operation.params, context);
    case "collectionProductAdd":
      return kernel.runScript(CollectionAddProductsScript, operation.params, context);
    case "collectionProductRemove":
      return kernel.runScript(CollectionRemoveProductsScript, operation.params, context);
    case "collectionProductMove":
      return kernel.runScript(CollectionMoveProductScript, operation.params, context);
    case "collectionProductClear":
      return kernel.runScript(CollectionClearProductsScript, operation.params, context);
    case "collectionProductRebalance":
      return kernel.runScript(CollectionRebalanceScript, operation.params, context);
    case "collectionRulesReplace":
      return kernel.runScript(CollectionUpdateRulesScript, operation.params, context);
    default:
      return assertNever(operation);
  }
}

function collectionScriptContext(context: CollectionWorkflowContext): RunScriptContext {
  return {
    storeId: context.storeId,
    organizationId: context.organizationId,
    requestId: context.requestId,
    userId: context.userId,
    locale: context.locale,
    defaultLocale: context.defaultLocale,
    defaultCurrency: context.defaultCurrency,
    locales: [...context.locales],
    currencies: [...context.currencies],
  };
}

function operationEntityId(operation: CollectionUpdateOperation): string {
  switch (operation.type) {
    case "collectionProductAdd":
    case "collectionProductRemove":
      return operation.params.productIds[0]!;
    case "collectionProductMove":
      return operation.params.productId;
    case "collectionFieldsUpdate":
      return operation.params.id;
    case "collectionProductClear":
    case "collectionProductRebalance":
    case "collectionRulesReplace":
      return operation.params.collectionId;
    default:
      return assertNever(operation);
  }
}

function operationCollectionId(operation: CollectionUpdateOperation): string {
  return operation.type === "collectionFieldsUpdate"
    ? operation.params.id
    : operation.params.collectionId;
}

function collectionOperationReasons(
  operation: CollectionUpdateOperation,
): CollectionUpdatedReason[] {
  switch (operation.type) {
    case "collectionFieldsUpdate":
      return [...(operation.meta.reasons ?? ["metadata"])];
    case "collectionRulesReplace":
      return ["rules"];
    case "collectionProductMove":
    case "collectionProductRebalance":
      return ["rank"];
    default:
      return ["items"];
  }
}

function collectionOperationAudit(
  operation: CollectionUpdateOperation,
  position: number,
): CollectionAuditOperation {
  const action =
    operation.type === "collectionProductAdd"
      ? "LINK"
      : operation.type === "collectionProductRemove" || operation.type === "collectionProductClear"
        ? "UNLINK"
        : operation.type === "collectionProductMove" ||
            operation.type === "collectionProductRebalance"
          ? "MOVE"
          : "UPDATE";
  return {
    position,
    type: operation.type,
    action,
    target: {
      type: isCollectionProductOperation(operation) ? "product" : "collection",
      id: operationEntityId(operation),
    },
    changes: [
      {
        path:
          operation.type === "collectionFieldsUpdate"
            ? "fields"
            : operation.type === "collectionRulesReplace"
              ? "rules"
              : "products",
        kind:
          action === "LINK"
            ? "ADD"
            : action === "UNLINK"
              ? "REMOVE"
              : action === "MOVE"
                ? "MOVE"
                : "SET",
      },
    ],
  };
}

function lifecycleAudit(
  type: string,
  action: "CREATE" | "DELETE",
  collectionId: string,
): CollectionAuditOperation {
  return {
    position: 0,
    type,
    action,
    target: { type: "collection", id: collectionId },
    changes: [],
  };
}

async function emitCollectionLifecycle(
  broker: ServiceBroker,
  context: CollectionWorkflowContext,
  collectionId: string,
  action: "CREATE" | "UPDATE" | "DELETE",
  command: string,
  operations: readonly CollectionAuditOperation[],
  reasons: readonly string[] = [],
  deletedAt?: string,
): Promise<void> {
  const suffix = action === "CREATE" ? "Created" : action === "UPDATE" ? "Updated" : "Deleted";
  await broker.runWorkflow(
    "events.emit",
    {
      eventType: `collection${suffix}`,
      payload: {
        storeId: context.storeId,
        collectionId,
        reasons: [...new Set(reasons)],
        ...(deletedAt ? { deletedAt } : {}),
        audit: {
          kind: "aggregate-mutation",
          schemaVersion: 1,
          storeId: context.storeId,
          action,
          command,
          aggregate: { type: "collection", id: collectionId },
          operations,
        },
      },
      context: { organizationId: context.organizationId, userId: context.userId },
      subject: { type: "collection", id: collectionId },
      actor: context.userId ? { type: "user", id: context.userId } : undefined,
      emitKey: `collection:${collectionId}`,
    },
    {
      source: "workflow",
      workflowId: DBOS.workflowID!,
      stepId: `emitCollection${suffix}`,
      callId: collectionId,
      organizationId: context.organizationId,
    },
  );
}

function prefixCollectionErrors(
  errors: readonly UserError[],
  prefix: readonly string[],
): UserError[] {
  return errors.map((error) => ({
    ...error,
    field: error.field ? [...prefix, ...error.field.slice(1)] : [...prefix],
  }));
}

function assertNever(value: never): never {
  throw new Error(`Unhandled collection operation: ${String(value)}`);
}
