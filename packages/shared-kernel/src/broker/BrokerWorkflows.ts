/**
 * @file BrokerWorkflows
 * @description Workflow base class with broker integration
 */

import { BaseWorkflow } from "@shopana/dbos";
import type { ServiceBroker } from "./ServiceBroker.js";

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
export abstract class BrokerWorkflows<TInput = unknown, TOutput = unknown> extends BaseWorkflow<TInput, TOutput> {
  constructor(public readonly broker: ServiceBroker) {
    super(
      broker.getWorkflowRegistry(),
      broker["options"].serviceName,
    );
  }
}
