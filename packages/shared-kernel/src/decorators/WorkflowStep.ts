import "reflect-metadata";
import { DBOS } from "@dbos-inc/dbos-sdk";
import { runStep, type StepOptions } from "../workflow/runStep.js";

export const WORKFLOW_STEP_METADATA_KEY = Symbol("broker:workflowStep");

export type WorkflowStepMetadata = StepOptions;

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
 * @example
 * // Fire-and-forget (no retries)
 * @WorkflowStep({ retriesAllowed: false })
 * private async startCleanupWorkflow(fileId: string): Promise<void> { ... }
 *
 * @example
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

    if (options) {
      Reflect.defineMetadata(WORKFLOW_STEP_METADATA_KEY, options, target, propertyKey);
    }

    (descriptor as { value: (...args: unknown[]) => Promise<unknown> }).value =
      async function (...args: unknown[]) {
        const workflowId = DBOS.workflowID ?? "unknown";

        return runStep(
          () => originalMethod.apply(this, args),
          { ...options, methodName },
          { workflowId },
        );
      };

    return descriptor;
  };
}
