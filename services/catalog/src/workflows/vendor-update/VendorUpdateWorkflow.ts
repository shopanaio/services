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
import { VendorUpdateScript } from "./scripts/index.js";
import type {
  VendorOperationResult,
  VendorUpdateInput,
  VendorUpdateOperation,
  VendorUpdateResult,
} from "./dto/index.js";

interface VendorChanges {
  readonly operations: VendorAuditOperation[];
}
interface VendorAuditOperation {
  readonly position: number;
  readonly type: VendorUpdateOperation["type"];
  readonly action: "UPDATE";
  readonly target: { readonly type: "vendor"; readonly id: string };
  readonly changes: readonly { readonly path: "name"; readonly kind: "SET" }[];
}
type VendorStepResult = DurableStepResult<VendorOperationResult, VendorChanges>;

@Injectable()
export class VendorUpdateWorkflow extends AggregateUpdateWorkflow<
  VendorUpdateInput,
  VendorUpdateOperation,
  VendorOperationResult,
  VendorChanges,
  VendorUpdateResult
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

  @Workflow("vendorUpdate")
  @Policy<VendorUpdateInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  run(input: VendorUpdateInput): Promise<VendorUpdateResult> {
    const context: RunScriptContext = { ...input.context };
    return this.kernel.runWithWorkflowContext(context, () => this.executeAggregateUpdate(input));
  }

  protected operations(input: VendorUpdateInput) {
    return input.operations;
  }
  protected async prevalidateAggregate(_input: VendorUpdateInput): Promise<AggregatePrevalidation> {
    return { valid: true, errorsByOperationIndex: {}, userErrors: [] };
  }
  protected planOperations(
    operations: readonly AggregateOperationRef<VendorUpdateOperation>[],
  ): readonly AggregateOperationPlanItem[] {
    return operations.map(({ position }) => ({ positions: [position] }));
  }
  protected async applyPlanItem(
    input: VendorUpdateInput,
    item: AggregateOperationPlanItem,
  ): Promise<ReadonlyMap<number, VendorStepResult>> {
    if (item.positions.length !== 1) throw new Error("Vendor operations are applied independently");
    const position = item.positions[0]!;
    return new Map([
      [
        position,
        await this.updateVendor(input, input.operations[position]!, position, { ...input.context }),
      ],
    ]);
  }

  @TransactionalStep()
  private async updateVendor(
    input: VendorUpdateInput,
    operation: VendorUpdateOperation,
    position: number,
    context: RunScriptContext,
  ): Promise<VendorStepResult> {
    const result = await this.kernel.runScript(
      VendorUpdateScript,
      { id: input.vendorId, name: operation.name },
      context,
    );
    const applied = result.userErrors.length === 0 && result.vendor !== undefined;
    return {
      result: {
        type: operation.type,
        applied,
        entityId: result.vendor?.id,
        errors: result.userErrors,
      },
      changes: {
        operations: applied
          ? [
              {
                position,
                type: operation.type,
                action: "UPDATE",
                target: { type: "vendor", id: input.vendorId },
                changes: [{ path: "name", kind: "SET" }],
              },
            ]
          : [],
      },
    };
  }

  protected initialChanges(): VendorChanges {
    return { operations: [] };
  }
  protected mergeChanges(target: VendorChanges, source: VendorChanges | null): void {
    if (source) target.operations.push(...source.operations);
  }
  protected hasActualChanges(changes: VendorChanges): boolean {
    return changes.operations.length > 0;
  }
  protected prevalidationFailure(
    input: VendorUpdateInput,
    validation: AggregatePrevalidation,
  ): VendorUpdateResult {
    const operationResults = input.operations.map((operation, position) => ({
      type: operation.type,
      applied: false,
      errors: (validation.errorsByOperationIndex[position] ?? validation.userErrors) as UserError[],
    }));
    return { vendor: null, operationResults, userErrors: validation.userErrors as UserError[] };
  }
  protected async successResult(
    input: VendorUpdateInput,
    operationResults: readonly VendorOperationResult[],
    changes: VendorChanges,
  ): Promise<VendorUpdateResult> {
    if (this.hasActualChanges(changes)) await this.emitUpdated(input, changes.operations);
    return {
      vendor: operationResults.some((result) => result.applied) ? { id: input.vendorId } : null,
      operationResults,
      userErrors: operationResults.flatMap((result) => result.errors),
    };
  }

  @ChildWorkflowStep()
  private async emitUpdated(
    input: VendorUpdateInput,
    operations: readonly VendorAuditOperation[],
  ): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "vendorUpdated",
        payload: {
          storeId: input.context.storeId,
          vendorId: input.vendorId,
          audit: {
            kind: "aggregate-mutation",
            schemaVersion: 1,
            storeId: input.context.storeId,
            action: "UPDATE",
            command: "vendorUpdate",
            aggregate: { type: "vendor", id: input.vendorId },
            operations,
          },
        },
        context: { organizationId: input.context.organizationId, userId: input.context.userId },
        subject: { type: "vendor", id: input.vendorId },
        actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
        emitKey: `vendor:${input.vendorId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitVendorUpdated",
        callId: input.vendorId,
        organizationId: input.context.organizationId,
      },
    );
  }
}
