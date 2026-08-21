/**
 * @file BrokerWorkflows
 * @description Workflow base class with broker integration
 */

import { BaseWorkflow } from "@shopana/dbos";
import type { ServiceBroker } from "./ServiceBroker.js";

/**
 * Persisted tenant scope required by context-aware service workflows.
 *
 * This is a DBOS workflow argument, not an AsyncLocalStorage object. Services
 * construct their ephemeral runtime context from it inside the workflow so a
 * replay never depends on the original request.
 */
export interface DurableWorkflowContext {
  readonly organizationId: string;
  readonly storeId: string;
  readonly locale: string;
  readonly requestId: string;
  readonly userId?: string;
}

/** A workflow input that carries persisted context for deterministic replay. */
export interface ContextualWorkflowInput<
  TContext extends DurableWorkflowContext = DurableWorkflowContext,
> {
  readonly context: TContext;
}

/**
 * Workflow base class with broker integration.
 *
 * Extends BaseWorkflow from @shopana/dbos and adds:
 * - Access to ServiceBroker for inter-service calls
 * - Automatic service name resolution from broker
 *
 * @example
 * class FileCleanupWorkflow extends BrokerWorkflows<string, CleanupResult> {
 *   constructor(broker: ServiceBroker) {
 *     super(broker);
 *   }
 *
 *   @Workflow("fileCleanup")
 *   async run(fileId: string): Promise<CleanupResult> {
 *     await this.broker.call('notifications.send', { ... });
 *     return { cleaned: true };
 *   }
 * }
 */
export abstract class BrokerWorkflows<
  TInput extends ContextualWorkflowInput = ContextualWorkflowInput,
  TOutput = unknown,
> extends BaseWorkflow<TInput, TOutput> {
  constructor(public readonly broker: ServiceBroker) {
    super(broker.getWorkflowRegistry(), broker["options"].serviceName);
  }

  /**
   * Access persisted workflow scope. Runtime ServiceContext/ALS must be
   * constructed by the service from this value inside its workflow entrypoint.
   */
  protected workflowContext(input: TInput): TInput["context"] {
    return input.context;
  }
}
