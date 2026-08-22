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
import { OptionCategoryUpdateScript } from "./scripts/index.js";
import type {
  ProductOptionCategoryUpdateInput,
  ProductOptionCategoryUpdateOperation,
  ProductOptionCategoryOperationResult,
  ProductOptionCategoryUpdateResult,
} from "./dto/index.js";

interface ProductOptionCategoryAuditOperation {
  readonly position: number;
  readonly type: ProductOptionCategoryUpdateOperation["type"];
  readonly action: "UPDATE";
  readonly target: { readonly type: "productOptionCategory"; readonly id: string };
  readonly changes: readonly { readonly path: string; readonly kind: "SET" }[];
}
interface ProductOptionCategoryChanges {
  readonly operations: ProductOptionCategoryAuditOperation[];
}
type ProductOptionCategoryStepResult = DurableStepResult<
  ProductOptionCategoryOperationResult,
  ProductOptionCategoryChanges
>;

@Injectable()
export class ProductOptionCategoryUpdateWorkflow extends AggregateUpdateWorkflow<
  ProductOptionCategoryUpdateInput,
  ProductOptionCategoryUpdateOperation,
  ProductOptionCategoryOperationResult,
  ProductOptionCategoryChanges,
  ProductOptionCategoryUpdateResult
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

  @Workflow("productOptionCategoryUpdate")
  @Policy<ProductOptionCategoryUpdateInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  run(input: ProductOptionCategoryUpdateInput): Promise<ProductOptionCategoryUpdateResult> {
    const context: RunScriptContext = { ...input.context };
    return this.kernel.runWithWorkflowContext(context, () => this.executeAggregateUpdate(input));
  }

  protected operations(input: ProductOptionCategoryUpdateInput) {
    return input.operations;
  }
  protected async prevalidateAggregate(
    _input: ProductOptionCategoryUpdateInput,
  ): Promise<AggregatePrevalidation> {
    return { valid: true, errorsByOperationIndex: {}, userErrors: [] };
  }
  protected planOperations(
    operations: readonly AggregateOperationRef<ProductOptionCategoryUpdateOperation>[],
  ): readonly AggregateOperationPlanItem[] {
    return operations.map(({ position }) => ({ positions: [position] }));
  }
  protected async applyPlanItem(
    input: ProductOptionCategoryUpdateInput,
    item: AggregateOperationPlanItem,
  ): Promise<ReadonlyMap<number, ProductOptionCategoryStepResult>> {
    if (item.positions.length !== 1)
      throw new Error("ProductOptionCategory operations are applied independently");
    const position = item.positions[0]!;
    return new Map([
      [
        position,
        await this.updateProductOptionCategory(input, input.operations[position]!, position, {
          ...input.context,
        }),
      ],
    ]);
  }

  @TransactionalStep()
  private async updateProductOptionCategory(
    input: ProductOptionCategoryUpdateInput,
    operation: ProductOptionCategoryUpdateOperation,
    position: number,
    context: RunScriptContext,
  ): Promise<ProductOptionCategoryStepResult> {
    const result = await this.kernel.runScript(
      OptionCategoryUpdateScript,
      { id: input.productOptionCategoryId, name: operation.name, slug: operation.slug },
      context,
    );
    const entity = result.category;
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
                target: { type: "productOptionCategory", id: input.productOptionCategoryId },
                changes: (["name", "slug"] as const)
                  .filter((path) => operation[path] !== undefined)
                  .map((path) => ({ path, kind: "SET" as const })),
              },
            ]
          : [],
      },
    };
  }

  protected initialChanges(): ProductOptionCategoryChanges {
    return { operations: [] };
  }
  protected mergeChanges(
    target: ProductOptionCategoryChanges,
    source: ProductOptionCategoryChanges | null,
  ): void {
    if (source) target.operations.push(...source.operations);
  }
  protected hasActualChanges(changes: ProductOptionCategoryChanges): boolean {
    return changes.operations.length > 0;
  }
  protected prevalidationFailure(
    input: ProductOptionCategoryUpdateInput,
    validation: AggregatePrevalidation,
  ): ProductOptionCategoryUpdateResult {
    const operationResults = input.operations.map((operation, position) => ({
      type: operation.type,
      applied: false,
      errors: (validation.errorsByOperationIndex[position] ?? validation.userErrors) as UserError[],
    }));
    return {
      productOptionCategory: null,
      operationResults,
      userErrors: validation.userErrors as UserError[],
    };
  }
  protected async successResult(
    input: ProductOptionCategoryUpdateInput,
    operationResults: readonly ProductOptionCategoryOperationResult[],
    changes: ProductOptionCategoryChanges,
  ): Promise<ProductOptionCategoryUpdateResult> {
    if (this.hasActualChanges(changes))
      await this.emitProductOptionCategoryUpdated(input, changes.operations);
    return {
      productOptionCategory: operationResults.some((result) => result.applied)
        ? { id: input.productOptionCategoryId }
        : null,
      operationResults,
      userErrors: operationResults.flatMap((result) => result.errors),
    };
  }

  @ChildWorkflowStep()
  private async emitProductOptionCategoryUpdated(
    input: ProductOptionCategoryUpdateInput,
    operations: readonly ProductOptionCategoryAuditOperation[],
  ): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "productOptionCategoryUpdated",
        payload: {
          storeId: input.context.storeId,
          productOptionCategoryId: input.productOptionCategoryId,
          audit: {
            kind: "aggregate-mutation",
            schemaVersion: 1,
            storeId: input.context.storeId,
            action: "UPDATE",
            command: "productOptionCategoryUpdate",
            aggregate: { type: "productOptionCategory", id: input.productOptionCategoryId },
            operations,
          },
        },
        context: { organizationId: input.context.organizationId, userId: input.context.userId },
        subject: { type: "productOptionCategory", id: input.productOptionCategoryId },
        actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
        emitKey: `productOptionCategory:${input.productOptionCategoryId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitProductOptionCategoryUpdated",
        callId: input.productOptionCategoryId,
        organizationId: input.context.organizationId,
      },
    );
  }
}
