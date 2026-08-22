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
import {
  WarehouseStockCreateScript,
  WarehouseStockDeleteScript,
  WarehouseUpdateScript,
} from "./scripts/index.js";
import type {
  WarehouseOperationResult,
  WarehouseUpdateInput,
  WarehouseUpdateOperation,
  WarehouseUpdateResult,
} from "./dto/index.js";

interface WarehouseAuditOperation {
  readonly position: number;
  readonly type: WarehouseUpdateOperation["type"];
  readonly action: "UPDATE" | "LINK" | "UNLINK";
  readonly target: { readonly type: "warehouse" | "warehouseStock"; readonly id: string };
  readonly changes: readonly { readonly path: string; readonly kind: "SET" | "ADD" | "REMOVE" }[];
}
interface WarehouseChanges {
  readonly operations: WarehouseAuditOperation[];
}
type WarehouseStepResult = DurableStepResult<WarehouseOperationResult, WarehouseChanges>;

@Injectable()
export class WarehouseUpdateWorkflow extends AggregateUpdateWorkflow<
  WarehouseUpdateInput,
  WarehouseUpdateOperation,
  WarehouseOperationResult,
  WarehouseChanges,
  WarehouseUpdateResult
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

  @Workflow("warehouseUpdate")
  @Policy<WarehouseUpdateInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  run(input: WarehouseUpdateInput): Promise<WarehouseUpdateResult> {
    const context: RunScriptContext = { ...input.context };
    return this.kernel.runWithWorkflowContext(context, () => this.executeAggregateUpdate(input));
  }

  protected operations(input: WarehouseUpdateInput) {
    return input.operations;
  }
  protected async prevalidateAggregate(
    _input: WarehouseUpdateInput,
  ): Promise<AggregatePrevalidation> {
    return { valid: true, errorsByOperationIndex: {}, userErrors: [] };
  }
  protected planOperations(
    operations: readonly AggregateOperationRef<WarehouseUpdateOperation>[],
  ): readonly AggregateOperationPlanItem[] {
    return operations.map(({ position }) => ({ positions: [position] }));
  }
  protected async applyPlanItem(
    input: WarehouseUpdateInput,
    item: AggregateOperationPlanItem,
  ): Promise<ReadonlyMap<number, WarehouseStepResult>> {
    if (item.positions.length !== 1)
      throw new Error("Warehouse operations are applied independently");
    const position = item.positions[0]!;
    return new Map([
      [
        position,
        await this.applyWarehouseOperation(input, input.operations[position]!, position, {
          ...input.context,
        }),
      ],
    ]);
  }

  @TransactionalStep()
  private async applyWarehouseOperation(
    input: WarehouseUpdateInput,
    operation: WarehouseUpdateOperation,
    position: number,
    context: RunScriptContext,
  ): Promise<WarehouseStepResult> {
    if (operation.type === "warehouseFieldsUpdate") {
      const result = await this.kernel.runScript(
        WarehouseUpdateScript,
        {
          id: input.warehouseId,
          code: operation.code,
          name: operation.name,
          isDefault: operation.isDefault,
        },
        context,
      );
      const applied = result.userErrors.length === 0 && result.warehouse !== undefined;
      const changes = (["code", "name", "isDefault"] as const)
        .filter((path) => operation[path] !== undefined)
        .map((path) => ({ path, kind: "SET" as const }));
      return {
        result: {
          type: operation.type,
          applied,
          entityId: result.warehouse?.id,
          errors: result.userErrors,
        },
        changes: {
          operations: applied
            ? [
                {
                  position,
                  type: operation.type,
                  action: "UPDATE",
                  target: { type: "warehouse", id: input.warehouseId },
                  changes,
                },
              ]
            : [],
        },
      };
    }
    if (operation.type === "warehouseStockCreate") {
      const result = await this.kernel.runScript(
        WarehouseStockCreateScript,
        { items: [{ warehouseId: input.warehouseId, variantId: operation.variantId }] },
        context,
      );
      const entityId = result.warehouseStocks[0]?.id;
      const errors = prefixErrors(result.userErrors, operation.meta.fieldPrefix);
      const applied = errors.length === 0 && entityId !== undefined;
      return {
        result: { type: operation.type, applied, entityId, errors },
        changes: {
          operations: applied
            ? [
                {
                  position,
                  type: operation.type,
                  action: "LINK",
                  target: { type: "warehouseStock", id: entityId },
                  changes: [{ path: "stock", kind: "ADD" }],
                },
              ]
            : [],
        },
      };
    }
    const result = await this.kernel.runScript(
      WarehouseStockDeleteScript,
      { items: [{ warehouseId: input.warehouseId, variantId: operation.variantId }] },
      context,
    );
    const entityId = result.deletedWarehouseStockIds[0];
    const errors = prefixErrors(result.userErrors, operation.meta.fieldPrefix);
    const applied = errors.length === 0 && entityId !== undefined;
    return {
      result: { type: operation.type, applied, entityId, errors },
      changes: {
        operations: applied
          ? [
              {
                position,
                type: operation.type,
                action: "UNLINK",
                target: { type: "warehouseStock", id: entityId },
                changes: [{ path: "stock", kind: "REMOVE" }],
              },
            ]
          : [],
      },
    };
  }

  protected initialChanges(): WarehouseChanges {
    return { operations: [] };
  }
  protected mergeChanges(target: WarehouseChanges, source: WarehouseChanges | null): void {
    if (source) target.operations.push(...source.operations);
  }
  protected hasActualChanges(changes: WarehouseChanges): boolean {
    return changes.operations.length > 0;
  }
  protected prevalidationFailure(
    input: WarehouseUpdateInput,
    validation: AggregatePrevalidation,
  ): WarehouseUpdateResult {
    const operationResults = input.operations.map((operation, position) => ({
      type: operation.type,
      applied: false,
      errors: (validation.errorsByOperationIndex[position] ?? validation.userErrors) as UserError[],
    }));
    return { warehouse: null, operationResults, userErrors: validation.userErrors as UserError[] };
  }
  protected async successResult(
    input: WarehouseUpdateInput,
    operationResults: readonly WarehouseOperationResult[],
    changes: WarehouseChanges,
  ): Promise<WarehouseUpdateResult> {
    if (this.hasActualChanges(changes)) await this.emitWarehouseUpdated(input, changes.operations);
    return {
      warehouse: operationResults.some((result) => result.applied)
        ? { id: input.warehouseId }
        : null,
      operationResults,
      userErrors: operationResults.flatMap((result) => result.errors),
    };
  }

  @ChildWorkflowStep()
  private async emitWarehouseUpdated(
    input: WarehouseUpdateInput,
    operations: readonly WarehouseAuditOperation[],
  ): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "warehouseUpdated",
        payload: {
          storeId: input.context.storeId,
          warehouseId: input.warehouseId,
          audit: {
            kind: "aggregate-mutation",
            schemaVersion: 1,
            storeId: input.context.storeId,
            action: "UPDATE",
            command: "warehouseUpdate",
            aggregate: { type: "warehouse", id: input.warehouseId },
            operations,
          },
        },
        context: { organizationId: input.context.organizationId, userId: input.context.userId },
        subject: { type: "warehouse", id: input.warehouseId },
        actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
        emitKey: `warehouse:${input.warehouseId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitWarehouseUpdated",
        callId: input.warehouseId,
        organizationId: input.context.organizationId,
      },
    );
  }
}

function prefixErrors(errors: readonly UserError[], prefix: readonly string[]): UserError[] {
  return errors.map((error) => ({
    ...error,
    field: error.field ? [...prefix, ...error.field.slice(2)] : [...prefix],
  }));
}
