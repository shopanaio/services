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
import { ComparisonProfileUpdateScript } from "./scripts/index.js";
import type {
  ComparisonProfileUpdateInput,
  ComparisonProfileUpdateOperation,
  ComparisonProfileOperationResult,
  ComparisonProfileUpdateResult,
} from "./dto/index.js";

interface ComparisonProfileAuditOperation {
  readonly position: number;
  readonly type: ComparisonProfileUpdateOperation["type"];
  readonly action: "UPDATE";
  readonly target: { readonly type: "comparisonProfile"; readonly id: string };
  readonly changes: readonly { readonly path: string; readonly kind: "SET" }[];
}
interface ComparisonProfileChanges {
  readonly operations: ComparisonProfileAuditOperation[];
}
type ComparisonProfileStepResult = DurableStepResult<
  ComparisonProfileOperationResult,
  ComparisonProfileChanges
>;

@Injectable()
export class ComparisonProfileUpdateWorkflow extends AggregateUpdateWorkflow<
  ComparisonProfileUpdateInput,
  ComparisonProfileUpdateOperation,
  ComparisonProfileOperationResult,
  ComparisonProfileChanges,
  ComparisonProfileUpdateResult
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

  @Workflow("comparisonProfileUpdate")
  @Policy<ComparisonProfileUpdateInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  run(input: ComparisonProfileUpdateInput): Promise<ComparisonProfileUpdateResult> {
    const context: RunScriptContext = { ...input.context };
    return this.kernel.runWithWorkflowContext(context, () => this.executeAggregateUpdate(input));
  }

  protected operations(input: ComparisonProfileUpdateInput) {
    return input.operations;
  }
  protected async prevalidateAggregate(
    _input: ComparisonProfileUpdateInput,
  ): Promise<AggregatePrevalidation> {
    return { valid: true, errorsByOperationIndex: {}, userErrors: [] };
  }
  protected planOperations(
    operations: readonly AggregateOperationRef<ComparisonProfileUpdateOperation>[],
  ): readonly AggregateOperationPlanItem[] {
    return operations.map(({ position }) => ({ positions: [position] }));
  }
  protected async applyPlanItem(
    input: ComparisonProfileUpdateInput,
    item: AggregateOperationPlanItem,
  ): Promise<ReadonlyMap<number, ComparisonProfileStepResult>> {
    if (item.positions.length !== 1)
      throw new Error("ComparisonProfile operations are applied independently");
    const position = item.positions[0]!;
    return new Map([
      [
        position,
        await this.updateComparisonProfile(input, input.operations[position]!, position, {
          ...input.context,
        }),
      ],
    ]);
  }

  @TransactionalStep()
  private async updateComparisonProfile(
    input: ComparisonProfileUpdateInput,
    operation: ComparisonProfileUpdateOperation,
    position: number,
    context: RunScriptContext,
  ): Promise<ComparisonProfileStepResult> {
    const result = await this.kernel.runScript(
      ComparisonProfileUpdateScript,
      { id: input.comparisonProfileId, input: operation.definition },
      context,
    );
    const entity = result.profile;
    const applied = result.userErrors.length === 0 && entity !== undefined;
    return {
      result: { type: operation.type, applied, entityId: entity?.id, errors: result.userErrors },
      changes: {
        operations: applied
          ? [
              {
                position,
                type: operation.type,
                action: "UPDATE",
                target: { type: "comparisonProfile", id: input.comparisonProfileId },
                changes: [{ path: "definition" as const, kind: "SET" as const }],
              },
            ]
          : [],
      },
    };
  }

  protected initialChanges(): ComparisonProfileChanges {
    return { operations: [] };
  }
  protected mergeChanges(
    target: ComparisonProfileChanges,
    source: ComparisonProfileChanges | null,
  ): void {
    if (source) target.operations.push(...source.operations);
  }
  protected hasActualChanges(changes: ComparisonProfileChanges): boolean {
    return changes.operations.length > 0;
  }
  protected prevalidationFailure(
    input: ComparisonProfileUpdateInput,
    validation: AggregatePrevalidation,
  ): ComparisonProfileUpdateResult {
    const operationResults = input.operations.map((operation, position) => ({
      type: operation.type,
      applied: false,
      errors: (validation.errorsByOperationIndex[position] ?? validation.userErrors) as UserError[],
    }));
    return { profile: null, operationResults, userErrors: validation.userErrors as UserError[] };
  }
  protected async successResult(
    input: ComparisonProfileUpdateInput,
    operationResults: readonly ComparisonProfileOperationResult[],
    changes: ComparisonProfileChanges,
  ): Promise<ComparisonProfileUpdateResult> {
    if (this.hasActualChanges(changes))
      await this.emitComparisonProfileUpdated(input, changes.operations);
    return {
      profile: operationResults.some((result) => result.applied)
        ? { id: input.comparisonProfileId }
        : null,
      operationResults,
      userErrors: operationResults.flatMap((result) => result.errors),
    };
  }

  @ChildWorkflowStep()
  private async emitComparisonProfileUpdated(
    input: ComparisonProfileUpdateInput,
    operations: readonly ComparisonProfileAuditOperation[],
  ): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "comparisonProfileUpdated",
        payload: {
          storeId: input.context.storeId,
          comparisonProfileId: input.comparisonProfileId,
          audit: {
            kind: "aggregate-mutation",
            schemaVersion: 1,
            storeId: input.context.storeId,
            action: "UPDATE",
            command: "comparisonProfileUpdate",
            aggregate: { type: "comparisonProfile", id: input.comparisonProfileId },
            operations,
          },
        },
        context: { organizationId: input.context.organizationId, userId: input.context.userId },
        subject: { type: "comparisonProfile", id: input.comparisonProfileId },
        actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
        emitKey: `comparisonProfile:${input.comparisonProfileId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitComparisonProfileUpdated",
        callId: input.comparisonProfileId,
        organizationId: input.context.organizationId,
      },
    );
  }
}
