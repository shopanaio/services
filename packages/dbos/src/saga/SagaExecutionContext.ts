/**
 * @file Saga Execution Context
 * @description AsyncLocalStorage-based context for tracking saga execution
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type { SagaStepConfig, ExecutedStep } from "../core/types.js";

/**
 * Saga execution context.
 * Tracks executed steps for compensation.
 */
export class SagaExecutionContext {
  readonly sagaId: string;
  private executedSteps: ExecutedStep[] = [];
  private failedStep?: string;

  constructor(sagaId: string) {
    this.sagaId = sagaId;
  }

  /** Record successfully executed step (for compensation) */
  recordStep(
    method: string,
    stepName: string,
    args: unknown[],
    config: SagaStepConfig,
  ): void {
    this.executedSteps.push({ method, stepName, args, config });
  }

  /** Record failed step */
  recordFailure(method: string): void {
    this.failedStep = method;
  }

  /** Get failed step */
  getFailedStep(): string | undefined {
    return this.failedStep;
  }

  /** Get steps to compensate (reverse order) */
  getStepsToCompensate(): ExecutedStep[] {
    return [...this.executedSteps].reverse();
  }
}

/** AsyncLocalStorage for passing saga context across async calls */
export const sagaContextStorage = new AsyncLocalStorage<SagaExecutionContext>();

/** Get current context (throws if outside saga) */
export function getSagaContext(): SagaExecutionContext {
  const ctx = sagaContextStorage.getStore();
  if (!ctx) {
    throw new Error("SagaStep called outside of saga execution context");
  }
  return ctx;
}
