import "reflect-metadata";
import { DBOS } from "@dbos-inc/dbos-sdk";

export const WORKFLOW_METADATA_KEY = Symbol("broker:workflow");

export interface WorkflowMetadata {
  /** Workflow name for registration */
  name: string;
  /** Idempotency strategy hint */
  idempotencyStrategy?: "client" | "workflow" | "content";
}

/**
 * Decorator that marks a method as a durable workflow.
 * Wraps DBOS.workflow() and adds registration metadata.
 *
 * @param name - Workflow name (will be prefixed with service name)
 * @param options - Optional configuration
 *
 * @example
 * class StoreWorkflows extends BrokerWorkflows {
 *   @Workflow("storeCreate")
 *   async createStore(input: StoreCreateInput): Promise<StoreCreateOutput> {
 *     // workflow implementation
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

    Reflect.defineMetadata(
      WORKFLOW_METADATA_KEY,
      metadata,
      target,
      propertyKey,
    );

    return DBOS.workflow()(target, propertyKey, descriptor);
  };
}
