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
 * IMPORTANT: The decorated method MUST be named `run` for WorkflowRegistry.start() to work.
 * This is because DBOS.startWorkflow(instance).run(params) convention is used internally.
 *
 * @param name - Workflow name (will be prefixed with service name)
 * @param options - Optional configuration
 *
 * @example
 * class StoreCreateWorkflow extends BrokerWorkflows {
 *   @Workflow("storeCreate")
 *   async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
 *     const storeId = await this.generateStoreId();
 *     await this.createStore(storeId, input);
 *     return { storeId };
 *   }
 *
 *   @Step()
 *   private async generateStoreId(): Promise<string> {
 *     return uuidv7();
 *   }
 * }
 *
 * // Usage via broker:
 * await broker.runWorkflow("project.storeCreate", input, {
 *   source: "client",
 *   clientKey: ctx.idempotencyKey,
 *   tenantId: ctx.organizationId,
 *   apiKeyId: ctx.apiKeyId,
 * });
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

    // DBOS.workflow expects string, but MethodDecorator provides string | symbol
    const key = typeof propertyKey === "symbol" ? propertyKey.toString() : propertyKey;
    return DBOS.workflow()(target, key, descriptor);
  };
}
