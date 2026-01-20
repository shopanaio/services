import "reflect-metadata";
import { DBOS, type StepConfig } from "@dbos-inc/dbos-sdk";

export const STEP_METADATA_KEY = Symbol("broker:step");

export interface StepMetadata {
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
export function Step(options?: StepMetadata): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    if (options) {
      Reflect.defineMetadata(STEP_METADATA_KEY, options, target, propertyKey);
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

    return DBOS.step(stepConfig)(target, propertyKey, descriptor);
  };
}
