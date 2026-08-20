import { Injectable } from "@nestjs/common";
import type {
  ApplyOrderIntegrationEventV1Result,
  CompleteOrderFulfillmentServiceOperationV1Result,
} from "@shopana/broker-types";
import {
  BrokerWorkflows,
  InjectBroker,
  type ServiceBroker,
  TransactionalStep,
  Workflow,
} from "@shopana/shared-kernel";
import {
  applyOrderIntegrationEventV1Schema,
  completeOrderFulfillmentServiceOperationV1Schema,
  type FulfillmentServiceCallbackWorkflowInput,
  type IntegrationEventWorkflowInput,
} from "../../domain/integration/OrderProviderContracts.js";
import { Repository } from "../../repositories/Repository.js";

@Injectable()
export class CompleteOrderFulfillmentServiceOperationWorkflow extends BrokerWorkflows<
  FulfillmentServiceCallbackWorkflowInput,
  CompleteOrderFulfillmentServiceOperationV1Result
> {
  constructor(
    @InjectBroker("order") broker: ServiceBroker,
    private readonly repository: Repository,
  ) {
    super(broker);
  }

  @Workflow("completeOrderFulfillmentServiceOperationV1", { idempotencyStrategy: "content" })
  run(input: FulfillmentServiceCallbackWorkflowInput) {
    completeOrderFulfillmentServiceOperationV1Schema.parse(input.input);
    return this.apply(input);
  }

  @TransactionalStep({
    txManager: (self: CompleteOrderFulfillmentServiceOperationWorkflow) =>
      self.repository.txManager,
    bridge: (self: CompleteOrderFulfillmentServiceOperationWorkflow) =>
      self.repository.dbosTransactionBridge,
  })
  private apply(input: FulfillmentServiceCallbackWorkflowInput) {
    return this.repository.admin.provider.applyFulfillmentServiceCallback(input);
  }
}

@Injectable()
export class ApplyOrderIntegrationEventWorkflow extends BrokerWorkflows<
  IntegrationEventWorkflowInput,
  ApplyOrderIntegrationEventV1Result
> {
  constructor(
    @InjectBroker("order") broker: ServiceBroker,
    private readonly repository: Repository,
  ) {
    super(broker);
  }

  @Workflow("applyOrderIntegrationEventV1", { idempotencyStrategy: "content" })
  run(input: IntegrationEventWorkflowInput) {
    applyOrderIntegrationEventV1Schema.parse(input.input);
    return this.apply(input);
  }

  @TransactionalStep({
    txManager: (self: ApplyOrderIntegrationEventWorkflow) => self.repository.txManager,
    bridge: (self: ApplyOrderIntegrationEventWorkflow) => self.repository.dbosTransactionBridge,
  })
  private apply(input: IntegrationEventWorkflowInput) {
    return this.repository.admin.provider.applyIntegrationEvent(input);
  }
}
