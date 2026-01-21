import "reflect-metadata";
import { DBOS, type StepConfig } from "@dbos-inc/dbos-sdk";

export const WORKFLOW_STEP_METADATA_KEY = Symbol("broker:workflowStep");

export interface WorkflowStepMetadata {
  /** Step name for logging/debugging */
  name?: string;
  /** Whether retries are allowed */
  retriesAllowed?: boolean;
  /** Maximum retry attempts */
  maxAttempts?: number;
  /** Initial retry interval in seconds */
  intervalSeconds?: number;
  /** Backoff multiplier */
  backoffRate?: number;
}

/**
 * Decorator that marks a method as a workflow step.
 * Wraps DBOS.step() with additional metadata.
 *
 * @param options - Step configuration
 */
export function WorkflowStep(options?: WorkflowStepMetadata): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    if (options) {
      Reflect.defineMetadata(WORKFLOW_STEP_METADATA_KEY, options, target, propertyKey);
    }

    const stepConfig: StepConfig = {};
    if (options?.retriesAllowed !== undefined) {
      stepConfig.retriesAllowed = options.retriesAllowed;
    }
    if (options?.maxAttempts !== undefined) {
      stepConfig.maxAttempts = options.maxAttempts;
    }
    if (options?.intervalSeconds !== undefined) {
      stepConfig.intervalSeconds = options.intervalSeconds;
    }
    if (options?.backoffRate !== undefined) {
      stepConfig.backoffRate = options.backoffRate;
    }

    // DBOS.step expects string, but MethodDecorator provides string | symbol
    const key = typeof propertyKey === "symbol" ? propertyKey.toString() : propertyKey;
    return DBOS.step(stepConfig)(target, key, descriptor);
  };
}
