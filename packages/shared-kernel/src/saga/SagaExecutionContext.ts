/**
 * @file Saga Execution Context
 * @description AsyncLocalStorage-based context for tracking saga execution
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type { SagaStepConfig, ExecutedStep } from "./types.js";

/**
 * Saga execution context.
 * Tracks executed steps for compensation.
 */
export class SagaExecutionContext {
  readonly sagaId: string;
  private executedSteps: ExecutedStep[] = [];
  private compensatedSteps: string[] = [];
  private attempts: Record<string, number> = {};
  private compAttempts: Record<string, number> = {};
  private warnings: Array<{ step: string; message: string }> = [];
  private failedStep?: string;

  constructor(sagaId: string) {
    this.sagaId = sagaId;
  }

  // ========================================================================
  // Step execution tracking
  // ========================================================================

  /** Record step attempt (called before each execution, including retries) */
  recordAttempt(method: string): number {
    this.attempts[method] = (this.attempts[method] ?? 0) + 1;
    return this.attempts[method];
  }

  /** Get all step execution attempts */
  getAttempts(): Record<string, number> {
    return { ...this.attempts };
  }

  // ========================================================================
  // Compensation tracking
  // ========================================================================

  /** Record compensation attempt */
  recordCompAttempt(method: string): number {
    this.compAttempts[method] = (this.compAttempts[method] ?? 0) + 1;
    return this.compAttempts[method];
  }

  /** Get compensation attempt count for step */
  getCompAttemptCount(method: string): number {
    return this.compAttempts[method] ?? 0;
  }

  /** Get all compensation attempts */
  getCompAttempts(): Record<string, number> {
    return { ...this.compAttempts };
  }

  /** Record successfully executed step */
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

  /** Record warning from non-critical step */
  recordWarning(step: string, message: string): void {
    this.warnings.push({ step, message });
  }

  /** Get warnings */
  getWarnings(): Array<{ step: string; message: string }> {
    return [...this.warnings];
  }

  /** Get failed step */
  getFailedStep(): string | undefined {
    return this.failedStep;
  }

  /** Get steps to compensate (reverse order) */
  getStepsToCompensate(): ExecutedStep[] {
    return [...this.executedSteps].reverse();
  }

  /** Get succeeded steps */
  getSucceededSteps(): string[] {
    return this.executedSteps.map((s) => s.method);
  }

  /** Mark step as compensated */
  markCompensated(method: string): void {
    this.compensatedSteps.push(method);
  }

  /** Get compensated steps */
  getCompensatedSteps(): string[] {
    return [...this.compensatedSteps];
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
