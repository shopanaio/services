import "reflect-metadata";
import { DBOS } from "@dbos-inc/dbos-sdk";
import { Logger } from "@nestjs/common";
import {
  type RetryPolicy,
  StepTimeoutError,
  isRetryableError,
  withTimeout,
  DEFAULT_STEP_TIMEOUT_MS,
} from "../saga/types.js";

export const WORKFLOW_STEP_METADATA_KEY = Symbol("broker:workflowStep");

const logger = new Logger("WorkflowStep");

export interface WorkflowStepMetadata {
  /** Step name for logging/debugging */
  name?: string;
  /** Whether retries are allowed (default: true) */
  retriesAllowed?: boolean;
  /** Maximum retry attempts */
  maxAttempts?: number;
  /** Initial retry interval in seconds */
  intervalSeconds?: number;
  /** Backoff multiplier */
  backoffRate?: number;
  /** Step execution timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
  /** If false, failure does not stop the workflow (default: true) */
  critical?: boolean;
}

/**
 * Decorator that marks a method as a workflow step.
 *
 * Uses DBOS.runStep() for fine-grained control over retry behavior:
 * - Timeout errors are non-retryable
 * - FatalError/non-retryable errors skip retry and fail immediately
 * - RetryableError/transient errors trigger DBOS automatic retry
 *
 * @param options - Step configuration
 *
 * @example
 * // With aggressive retries
 * @WorkflowStep({
 *   maxAttempts: 10,
 *   intervalSeconds: 60,
 *   backoffRate: 2,
 * })
 * private async notifyInventory(fileId: string): Promise<void> { ... }
 *
 * // Fire-and-forget (no retries)
 * @WorkflowStep({ retriesAllowed: false })
 * private async startCleanupWorkflow(fileId: string): Promise<void> { ... }
 *
 * // Non-critical step (failure doesn't stop workflow)
 * @WorkflowStep({ critical: false })
 * private async sendNotification(): Promise<void> { ... }
 */
export function WorkflowStep(options?: WorkflowStepMetadata): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as Function;
    const methodName =
      typeof propertyKey === "symbol" ? propertyKey.toString() : propertyKey;
    const stepName = options?.name ?? methodName;
    const timeoutMs = options?.timeoutMs ?? DEFAULT_STEP_TIMEOUT_MS;
    const isCritical = options?.critical !== false;

    if (options) {
      Reflect.defineMetadata(WORKFLOW_STEP_METADATA_KEY, options, target, propertyKey);
    }

    const retryPolicy: RetryPolicy = {
      maxAttempts: options?.maxAttempts ?? 1,
      intervalSeconds: options?.intervalSeconds ?? 0,
      backoffRate: options?.backoffRate ?? 1,
    };

    // Override retriesAllowed if explicitly set
    const retriesAllowed = options?.retriesAllowed ?? (retryPolicy.maxAttempts > 1);

    (descriptor as { value: (...args: unknown[]) => Promise<unknown> }).value =
      async function (...args: unknown[]) {
        const workflowId = DBOS.workflowID ?? "unknown";

        type InternalStepResult<T> =
          | { kind: "ok"; data: T }
          | { kind: "nonRetryableFailure"; error: Error }
          | { kind: "timeout"; error: StepTimeoutError };

        let stepResult: InternalStepResult<unknown>;

        try {
          stepResult = await DBOS.runStep<InternalStepResult<unknown>>(
            async () => {
              try {
                const result = await withTimeout(
                  originalMethod.apply(this, args),
                  timeoutMs,
                  stepName,
                );

                return { kind: "ok", data: result };
              } catch (error) {
                // Timeout is non-retryable
                if (error instanceof StepTimeoutError) {
                  return { kind: "timeout", error };
                }

                // Check if error should be retried
                if (!isRetryableError(error)) {
                  return { kind: "nonRetryableFailure", error: error as Error };
                }

                // Retryable error - throw to trigger DBOS retry
                throw error;
              }
            },
            {
              name: `step:${stepName}:${workflowId}`,
              retriesAllowed,
              maxAttempts: retryPolicy.maxAttempts,
              intervalSeconds: retryPolicy.intervalSeconds,
              backoffRate: retryPolicy.backoffRate,
            },
          );
        } catch (error) {
          // All retries exhausted
          const lastError = error as Error;
          logger.warn(`Step ${stepName} failed after retries exhausted`);

          if (!isCritical) {
            logger.warn(`Non-critical step ${stepName} failed, continuing workflow`);
            return undefined;
          }

          throw lastError;
        }

        // Handle non-retryable results
        if (
          stepResult.kind === "timeout" ||
          stepResult.kind === "nonRetryableFailure"
        ) {
          const failureError = stepResult.error;
          logger.debug(`Step ${stepName} failed with non-retryable error: ${failureError.message}`);

          if (!isCritical) {
            logger.warn(`Non-critical step ${stepName} failed, continuing workflow`);
            return undefined;
          }

          throw failureError;
        }

        return stepResult.data;
      };

    return descriptor;
  };
}
