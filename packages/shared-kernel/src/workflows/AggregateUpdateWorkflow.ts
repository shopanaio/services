import type { DurableStepResult } from "@shopana/dbos";
import { BrokerWorkflows, type ContextualWorkflowInput } from "../broker/BrokerWorkflows";

/**
 * A stable reference to a public update operation. `position` is the only
 * identity used for composing a response: implementation details such as a
 * batch must never change the public operation order.
 */
export interface AggregateOperationRef<TOperation> {
  readonly position: number;
  readonly operation: TOperation;
}

/** A plan item can be one operation or a contiguous, explicitly declared group. */
export interface AggregateOperationPlanItem {
  readonly positions: readonly number[];
}

export interface AggregatePrevalidation {
  readonly valid: boolean;
  readonly errorsByOperationIndex: Readonly<Record<number, readonly unknown[]>>;
  readonly userErrors: readonly unknown[];
}

/**
 * Durable orchestration contract for Admin aggregate updates.
 *
 * Subclasses supply domain validation and local transactional steps. This base
 * owns operation planning, result placement, and the post-commit event gate.
 * A plan may group operations only when their input positions are contiguous;
 * grouping is therefore an explicit implementation detail, never a reorder.
 */
export abstract class AggregateUpdateWorkflow<
  TInput extends ContextualWorkflowInput,
  TOperation,
  TOperationResult,
  TChanges,
  TOutput,
> extends BrokerWorkflows<TInput, TOutput> {
  protected abstract operations(input: TInput): readonly TOperation[];

  protected abstract prevalidateAggregate(input: TInput): Promise<AggregatePrevalidation>;

  protected abstract planOperations(
    operations: readonly AggregateOperationRef<TOperation>[],
  ): readonly AggregateOperationPlanItem[];

  /**
   * Every local write must occur in a subclass-owned @TransactionalStep().
   * Results are keyed by original input position, not by execution order.
   */
  protected abstract applyPlanItem(
    input: TInput,
    item: AggregateOperationPlanItem,
  ): Promise<ReadonlyMap<number, DurableStepResult<TOperationResult, TChanges>>>;

  protected abstract mergeChanges(target: TChanges, source: TChanges | null): void;

  protected abstract initialChanges(input: TInput): TChanges;

  protected abstract hasActualChanges(changes: TChanges): boolean;

  protected abstract prevalidationFailure(
    input: TInput,
    validation: AggregatePrevalidation,
  ): TOutput;

  protected abstract successResult(
    input: TInput,
    results: readonly TOperationResult[],
    changes: TChanges,
  ): Promise<TOutput>;

  protected async executeAggregateUpdate(input: TInput): Promise<TOutput> {
    const validation = await this.prevalidateAggregate(input);
    if (!validation.valid) {
      return this.prevalidationFailure(input, validation);
    }

    const operationRefs = this.operations(input).map((operation, position) => ({
      position,
      operation,
    }));
    const plan = this.planOperations(operationRefs);
    this.assertValidPlan(plan, operationRefs.length);

    const results = Array.from<TOperationResult | undefined>(
      { length: operationRefs.length },
      () => undefined,
    );
    const changes = this.initialChanges(input);

    for (const item of plan) {
      // Sequential execution is intentional: public operation order is contractual.
      // oxlint-disable-next-line eslint(no-await-in-loop)
      const applied = await this.applyPlanItem(input, item);
      this.assertCompletePlanResult(item, applied);

      for (const position of item.positions) {
        const step = applied.get(position)!;
        results[position] = step.result;
        this.mergeChanges(changes, step.changes);
      }
    }

    if (results.some((result) => result === undefined)) {
      throw new Error("Aggregate update plan left an operation result unset");
    }

    return this.successResult(input, results as TOperationResult[], changes);
  }

  private assertValidPlan(
    plan: readonly AggregateOperationPlanItem[],
    operationCount: number,
  ): void {
    const positions = plan.flatMap((item) => [...item.positions]);
    if (
      positions.length !== operationCount ||
      positions.some((position, index) => position !== index)
    ) {
      throw new Error("Aggregate update plan must cover every operation once in input order");
    }

    for (const item of plan) {
      if (item.positions.length === 0) {
        throw new Error("Aggregate update plan item cannot be empty");
      }
      const first = item.positions[0]!;
      if (item.positions.some((position, index) => position !== first + index)) {
        throw new Error("Aggregate update batch groups must contain contiguous input positions");
      }
    }
  }

  private assertCompletePlanResult(
    item: AggregateOperationPlanItem,
    result: ReadonlyMap<number, DurableStepResult<TOperationResult, TChanges>>,
  ): void {
    if (
      result.size !== item.positions.length ||
      item.positions.some((position) => !result.has(position))
    ) {
      throw new Error("Aggregate update plan item returned incomplete operation results");
    }
  }
}
