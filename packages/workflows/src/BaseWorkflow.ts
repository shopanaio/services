import type { ServiceBroker, Logger } from '@shopana/shared-kernel';
import type { WorkflowServices } from './types.js';

/**
 * Base class for durable workflows.
 *
 * Workflows extend this class and implement the `run` method decorated with @DBOS.workflow().
 * Individual steps within the workflow should be decorated with @DBOS.step() for durability.
 *
 * @example
 * ```typescript
 * export class MyWorkflow extends BaseWorkflow {
 *   @DBOS.workflow()
 *   async run(input: MyInput): Promise<MyOutput> {
 *     const result1 = await this.step1(input);
 *     const result2 = await this.step2(result1);
 *     return result2;
 *   }
 *
 *   @DBOS.step()
 *   async step1(input: MyInput): Promise<IntermediateResult> {
 *     return this.broker.call('service.action', input);
 *   }
 * }
 * ```
 */
export abstract class BaseWorkflow<TServices extends WorkflowServices = WorkflowServices> {
  protected readonly broker: ServiceBroker;
  protected readonly logger: Logger;

  constructor(services: TServices) {
    this.broker = services.broker;
    this.logger = services.logger;
  }
}
