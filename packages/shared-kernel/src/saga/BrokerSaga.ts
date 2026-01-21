/**
 * @file BrokerSaga Base Class
 * @description Base class for sagas with broker integration
 */

import { Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfiguredInstance } from "@dbos-inc/dbos-sdk";
import type { ServiceBroker } from "../broker/ServiceBroker.js";
import type { WorkflowRegistry } from "../workflow/WorkflowRegistry.js";
import { SAGA_DEFINITION_KEY } from "./decorators.js";
import "reflect-metadata";

/**
 * Base class for sagas with broker integration.
 */
export abstract class BrokerSaga<TInput, TOutput>
  extends ConfiguredInstance
  implements OnModuleInit, OnModuleDestroy
{
  protected readonly logger: Logger;

  constructor(public readonly broker: ServiceBroker) {
    super(new.target.name);
    this.logger = new Logger(this.constructor.name);
  }

  /** Access to workflow registry */
  protected get workflowRegistry(): WorkflowRegistry {
    return this.broker.getWorkflowRegistry();
  }

  /** Saga entry point - must be decorated with @Saga("name") */
  abstract run(input: TInput): Promise<TOutput>;

  onModuleInit(): void {
    this.registerSaga();
  }

  onModuleDestroy(): void {
    this.deregisterSaga();
  }

  private registerSaga(): void {
    const sagaMeta = Reflect.getMetadata(SAGA_DEFINITION_KEY, this.constructor);
    if (!sagaMeta) {
      throw new Error(
        `@Saga decorator missing on ${this.constructor.name}.run()`,
      );
    }

    const qualifiedName = this.broker.qualifyAction(sagaMeta.name);

    this.workflowRegistry.register(qualifiedName, {
      instance: this,
      metadata: { name: sagaMeta.name },
    });

    this.logger.debug(`Registered saga: ${qualifiedName}`);
  }

  private deregisterSaga(): void {
    const sagaMeta = Reflect.getMetadata(SAGA_DEFINITION_KEY, this.constructor);
    if (sagaMeta) {
      const qualifiedName = this.broker.qualifyAction(sagaMeta.name);
      this.workflowRegistry.deregister(qualifiedName);
    }
  }
}
