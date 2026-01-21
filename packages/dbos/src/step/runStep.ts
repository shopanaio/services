/**
 * @file Step Execution Logic
 * @description Durable step execution with timeout, retry, and error handling
 */

import { DBOS } from "@dbos-inc/dbos-sdk";
import { Logger } from "@nestjs/common";
import {
  type RetryPolicy,
  DEFAULT_RETRY_POLICY,
} from "../core/types.js";
import {
  StepTimeoutError,
  isRetryableError,
  withTimeout,
  DEFAULT_STEP_TIMEOUT_MS,
} from "../core/errors.js";
import { stepContextStorage } from "./StepExecutionContext.js";

const logger = new Logger("WorkflowStep");

/** Step configuration options */
export interface StepOptions {
  /** Step name for logging/identification */
  name?: string;
  /** Step execution timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
  /** Retry policy for transient errors */
  retry?: RetryPolicy;
  /** Whether retries are allowed (overrides retry.maxAttempts > 1 check) */
  retriesAllowed?: boolean;
}

/** Internal step options (includes critical flag for saga use) */
export interface InternalStepOptions extends StepOptions {
  /** If false, failure does not stop the workflow (default: true). Used internally by sagas. */
  critical?: boolean;
}

/** Internal step result for DBOS serialization */
type InternalStepResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "nonRetryableFailure"; error: Error }
  | { kind: "timeout"; error: StepTimeoutError };

/**
 * Execute a step with DBOS durability, timeout, and retry handling.
 *
 * @param fn - The step function to execute. Receives an AbortSignal for cancellation on timeout.
 * @param options - Step configuration
 * @param context - Execution context (workflowId for step naming)
 * @returns Step result or undefined if non-critical step failed
 * @throws Error if critical step fails
 */
export async function runStep<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: InternalStepOptions & { methodName: string },
  context: { workflowId: string },
): Promise<T | undefined> {
  const stepName = options.name ?? options.methodName;
  const timeoutMs = options.timeoutMs ?? DEFAULT_STEP_TIMEOUT_MS;
  const isCritical = options.critical !== false;

  const retryPolicy: RetryPolicy = {
    ...DEFAULT_RETRY_POLICY,
    ...options.retry,
  };

  const retriesAllowed =
    options.retriesAllowed ?? retryPolicy.maxAttempts > 1;

  let stepResult: InternalStepResult<T>;

  try {
    stepResult = await DBOS.runStep<InternalStepResult<T>>(
      async () => {
        try {
          const result = await withTimeout(
            (signal) => stepContextStorage.run({ signal }, () => fn(signal)),
            timeoutMs,
            stepName,
          );
          return { kind: "ok", data: result };
        } catch (error) {
          if (error instanceof StepTimeoutError) {
            return { kind: "timeout", error };
          }

          if (!isRetryableError(error)) {
            return { kind: "nonRetryableFailure", error: error as Error };
          }

          // Retryable error - throw to trigger DBOS retry
          throw error;
        }
      },
      {
        name: `step:${stepName}:${context.workflowId}`,
        retriesAllowed,
        maxAttempts: retryPolicy.maxAttempts,
        intervalSeconds: retryPolicy.intervalSeconds,
        backoffRate: retryPolicy.backoffRate,
      },
    );
  } catch (error) {
    // All retries exhausted
    logger.warn(`Step ${stepName} failed after retries exhausted`);

    if (!isCritical) {
      logger.warn(`Non-critical step ${stepName} failed, continuing workflow`);
      return undefined;
    }

    throw error;
  }

  // Handle non-retryable results
  if (
    stepResult.kind === "timeout" ||
    stepResult.kind === "nonRetryableFailure"
  ) {
    const failureError = stepResult.error;
    logger.debug(
      `Step ${stepName} failed with non-retryable error: ${failureError.message}`,
    );

    if (!isCritical) {
      logger.warn(`Non-critical step ${stepName} failed, continuing workflow`);
      return undefined;
    }

    throw failureError;
  }

  return stepResult.data;
}
