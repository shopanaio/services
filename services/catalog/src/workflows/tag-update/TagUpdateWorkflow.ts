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
import { Kernel } from "../../kernel/Kernel.js";
import type { RunScriptContext } from "../../kernel/types.js";
import type { UserError } from "../../kernel/BaseScript.js";
import { TransactionalStep } from "../CatalogTransactionalStep.js";
import { TagUpdateScript } from "./scripts/index.js";
import type {
  TagOperationResult,
  TagUpdateInput,
  TagUpdateOperation,
  TagUpdateResult,
} from "./dto/index.js";

interface TagAuditOperation {
  readonly position: number;
  readonly type: TagUpdateOperation["type"];
  readonly action: "UPDATE";
  readonly target: { readonly type: "tag"; readonly id: string };
  readonly changes: readonly { readonly path: "handle" | "name"; readonly kind: "SET" }[];
}
interface TagChanges {
  readonly operations: TagAuditOperation[];
  readonly affectedProductIds: string[];
}
type TagStepResult = DurableStepResult<TagOperationResult, TagChanges>;

@Injectable()
export class TagUpdateWorkflow extends AggregateUpdateWorkflow<
  TagUpdateInput,
  TagUpdateOperation,
  TagOperationResult,
  TagChanges,
  TagUpdateResult
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

  @Workflow("tagUpdate")
  @Policy<TagUpdateInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  run(input: TagUpdateInput): Promise<TagUpdateResult> {
    const context: RunScriptContext = { ...input.context };
    return this.kernel.runWithWorkflowContext(context, () => this.executeAggregateUpdate(input));
  }

  protected operations(input: TagUpdateInput) {
    return input.operations;
  }
  protected async prevalidateAggregate(_input: TagUpdateInput): Promise<AggregatePrevalidation> {
    return { valid: true, errorsByOperationIndex: {}, userErrors: [] };
  }
  protected planOperations(
    operations: readonly AggregateOperationRef<TagUpdateOperation>[],
  ): readonly AggregateOperationPlanItem[] {
    return operations.map(({ position }) => ({ positions: [position] }));
  }
  protected async applyPlanItem(
    input: TagUpdateInput,
    item: AggregateOperationPlanItem,
  ): Promise<ReadonlyMap<number, TagStepResult>> {
    if (item.positions.length !== 1) throw new Error("Tag operations are applied independently");
    const position = item.positions[0]!;
    return new Map([
      [
        position,
        await this.updateTag(input, input.operations[position]!, position, { ...input.context }),
      ],
    ]);
  }

  @TransactionalStep()
  private async updateTag(
    input: TagUpdateInput,
    operation: TagUpdateOperation,
    position: number,
    context: RunScriptContext,
  ): Promise<TagStepResult> {
    const result = await this.kernel.runScript(
      TagUpdateScript,
      { id: input.tagId, handle: operation.handle, name: operation.name },
      context,
    );
    const applied = result.userErrors.length === 0 && result.tag !== undefined;
    const changes = (["handle", "name"] as const)
      .filter((path) => operation[path] !== undefined)
      .map((path) => ({ path, kind: "SET" as const }));
    return {
      result: {
        type: operation.type,
        applied,
        entityId: result.tag?.id,
        errors: result.userErrors,
      },
      changes: {
        operations: applied
          ? [
              {
                position,
                type: operation.type,
                action: "UPDATE",
                target: { type: "tag", id: input.tagId },
                changes,
              },
            ]
          : [],
        affectedProductIds: applied ? result.affectedProductIds : [],
      },
    };
  }

  protected initialChanges(): TagChanges {
    return { operations: [], affectedProductIds: [] };
  }
  protected mergeChanges(target: TagChanges, source: TagChanges | null): void {
    if (source) {
      target.operations.push(...source.operations);
      target.affectedProductIds.push(...source.affectedProductIds);
    }
  }
  protected hasActualChanges(changes: TagChanges): boolean {
    return changes.operations.length > 0;
  }
  protected prevalidationFailure(
    input: TagUpdateInput,
    validation: AggregatePrevalidation,
  ): TagUpdateResult {
    const operationResults = input.operations.map((operation, position) => ({
      type: operation.type,
      applied: false,
      errors: (validation.errorsByOperationIndex[position] ?? validation.userErrors) as UserError[],
    }));
    return { tag: null, operationResults, userErrors: validation.userErrors as UserError[] };
  }
  protected async successResult(
    input: TagUpdateInput,
    operationResults: readonly TagOperationResult[],
    changes: TagChanges,
  ): Promise<TagUpdateResult> {
    if (this.hasActualChanges(changes)) {
      await this.emitTagUpdated(input, changes.operations);
      await this.emitAffectedProducts(input, changes.affectedProductIds);
    }
    return {
      tag: operationResults.some((result) => result.applied) ? { id: input.tagId } : null,
      operationResults,
      userErrors: operationResults.flatMap((result) => result.errors),
    };
  }

  @ChildWorkflowStep()
  private async emitTagUpdated(
    input: TagUpdateInput,
    operations: readonly TagAuditOperation[],
  ): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "tagUpdated",
        payload: {
          storeId: input.context.storeId,
          tagId: input.tagId,
          audit: {
            kind: "aggregate-mutation",
            schemaVersion: 1,
            storeId: input.context.storeId,
            action: "UPDATE",
            command: "tagUpdate",
            aggregate: { type: "tag", id: input.tagId },
            operations,
          },
        },
        context: { organizationId: input.context.organizationId, userId: input.context.userId },
        subject: { type: "tag", id: input.tagId },
        actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
        emitKey: `tag:${input.tagId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitTagUpdated",
        callId: input.tagId,
        organizationId: input.context.organizationId,
      },
    );
  }

  @ChildWorkflowStep()
  private async emitAffectedProducts(
    input: TagUpdateInput,
    productIds: readonly string[],
  ): Promise<void> {
    for (const productId of new Set(productIds))
      await this.broker.runWorkflow(
        "events.emit",
        {
          eventType: "productUpdated",
          payload: { productId, storeId: input.context.storeId, reasons: ["tag"] },
          context: { organizationId: input.context.organizationId, userId: input.context.userId },
          subject: { type: "product", id: productId },
          actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
          emitKey: `product:${productId}`,
        },
        {
          source: "workflow",
          workflowId: DBOS.workflowID!,
          stepId: "emitAffectedProductUpdated",
          callId: productId,
          organizationId: input.context.organizationId,
        },
      );
  }
}
