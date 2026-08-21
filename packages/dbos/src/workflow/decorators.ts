/**
 * @file Workflow Decorators
 * @description Workflow decorators for durable workflow definitions
 */

import "reflect-metadata";
import { DBOS } from "@dbos-inc/dbos-sdk";
import { runStep, type StepOptions } from "../step/runStep.js";

// ============================================================================
// METADATA KEYS
// ============================================================================

export const WORKFLOW_METADATA_KEY = Symbol("dbos:workflow:definition");
export const WORKFLOW_STEP_METADATA_KEY = Symbol("dbos:workflow:step");
export const SIDE_EFFECT_STEP_METADATA_KEY = Symbol("dbos:workflow:side-effect-step");
export const CHILD_WORKFLOW_STEP_METADATA_KEY = Symbol("dbos:workflow:child-workflow-step");

// ============================================================================
// TYPES
// ============================================================================

export interface WorkflowMetadata {
  /** Workflow name for registration */
  name: string;
  /** Idempotency strategy hint */
  idempotencyStrategy?: "client" | "workflow" | "content" | "time-window";
}

export type WorkflowStepMetadata = StepOptions;
export type SideEffectStepMetadata = WorkflowStepMetadata;

export interface ChildWorkflowStepMetadata {
  /** Method name used for discovery and architecture validation. */
  methodName: string;
}

// ============================================================================
// @Workflow DECORATOR
// ============================================================================

/**
 * Decorator that marks a method as a durable workflow.
 * Wraps DBOS.workflow() and adds registration metadata.
 *
 * IMPORTANT: The decorated method MUST be named `run` for WorkflowRegistry.start() to work.
 * This is because DBOS.startWorkflow(instance).run(params) convention is used internally.
 *
 * @param name - Workflow name (will be prefixed with service name)
 * @param options - Optional configuration
 *
 * @example
 * class StoreCreateWorkflow extends BaseWorkflow {
 *   @Workflow("storeCreate")
 *   async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
 *     const storeId = await this.generateStoreId();
 *     await this.createStore(storeId, input);
 *     return { storeId };
 *   }
 *
 *   @WorkflowStep()
 *   private async generateStoreId(): Promise<string> {
 *     return uuidv7();
 *   }
 * }
 */
export function Workflow(
  name: string,
  options?: Partial<Omit<WorkflowMetadata, "name">>,
): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const metadata: WorkflowMetadata = {
      name,
      idempotencyStrategy: options?.idempotencyStrategy,
    };

    Reflect.defineMetadata(WORKFLOW_METADATA_KEY, metadata, target, propertyKey);

    // DBOS.workflow expects string, but MethodDecorator provides string | symbol
    const key = typeof propertyKey === "symbol" ? propertyKey.toString() : propertyKey;
    return DBOS.workflow()(target, key, descriptor);
  };
}

// ============================================================================
// @WorkflowStep DECORATOR
// ============================================================================

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
 *   retry: { maxAttempts: 10, intervalSeconds: 60, backoffRate: 2 }
 * })
 * private async notifyInventory(fileId: string): Promise<void> { ... }
 *
 * @example
 * // Fire-and-forget (no retries)
 * @WorkflowStep({ retriesAllowed: false })
 * private async writeDiagnosticSnapshot(fileId: string): Promise<void> { ... }
 */
export function WorkflowStep(options?: WorkflowStepMetadata): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as Function;
    const methodName = typeof propertyKey === "symbol" ? propertyKey.toString() : propertyKey;

    if (options) {
      Reflect.defineMetadata(WORKFLOW_STEP_METADATA_KEY, options, target, propertyKey);
    }

    (descriptor as { value: (...args: unknown[]) => Promise<unknown> }).value = async function (
      ...args: unknown[]
    ) {
      const workflowId = DBOS.workflowID ?? "unknown";

      return runStep(
        (_signal) => originalMethod.apply(this, args),
        { ...options, methodName },
        { workflowId },
      );
    };

    return descriptor;
  };
}

// ============================================================================
// @SideEffectStep DECORATOR
// ============================================================================

/**
 * Marks a direct external side effect as a durable DBOS step.
 *
 * Use for broker calls, HTTP APIs, S3, email, webhooks, and similar external
 * I/O. It has the same runtime behavior and options as @WorkflowStep(), while
 * carrying distinct metadata so architecture tooling can distinguish external
 * effects from reads and pure durable computations.
 */
export function SideEffectStep(options?: SideEffectStepMetadata): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    Reflect.defineMetadata(SIDE_EFFECT_STEP_METADATA_KEY, options ?? {}, target, propertyKey);
    WorkflowStep(options)(target, propertyKey, descriptor);
    return descriptor;
  };
}

// ============================================================================
// @ChildWorkflowStep DECORATOR
// ============================================================================

/**
 * Marks a semantic child workflow or saga invocation boundary.
 *
 * This decorator intentionally does not create a DBOS step and does not wrap
 * the method. The decorated method must be called directly from the parent
 * workflow body and use a deterministic child idempotency context. Do not
 * combine it with @WorkflowStep(), @SideEffectStep(), or @TransactionalStep().
 */
export function ChildWorkflowStep(): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const methodName = typeof propertyKey === "symbol" ? propertyKey.toString() : propertyKey;

    if (typeof descriptor.value !== "function") {
      throw new TypeError(
        `@ChildWorkflowStep cannot decorate "${methodName}" because it is not a method`,
      );
    }

    const metadata: ChildWorkflowStepMetadata = { methodName };
    Reflect.defineMetadata(CHILD_WORKFLOW_STEP_METADATA_KEY, metadata, target, propertyKey);
    return descriptor;
  };
}
