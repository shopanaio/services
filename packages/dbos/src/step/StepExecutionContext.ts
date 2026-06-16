/**
 * @file Step Execution Context
 * @description AsyncLocalStorage-based context for step execution with abort signal
 */

import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Step execution context.
 * Provides abort signal for cancellation on timeout.
 */
export interface StepExecutionContext {
  /** Abort signal for cancellation */
  readonly signal: AbortSignal;
}

/** AsyncLocalStorage for passing step context across async calls */
export const stepContextStorage = new AsyncLocalStorage<StepExecutionContext>();

/**
 * Get current step's abort signal.
 * Throws if called outside of step execution context.
 *
 * @throws Error if called outside of step execution
 *
 * @example
 * ```typescript
 * @WorkflowStep()
 * async fetchData(url: string): Promise<Data> {
 *   const signal = getSignal();
 *   return fetch(url, { signal });
 * }
 * ```
 */
export function getSignal(): AbortSignal {
  const ctx = stepContextStorage.getStore();
  if (!ctx) {
    throw new Error("getSignal() called outside of step execution context");
  }
  return ctx.signal;
}
