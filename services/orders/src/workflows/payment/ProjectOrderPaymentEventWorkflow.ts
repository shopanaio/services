import { Injectable } from "@nestjs/common";
import { z } from "zod";
import {
  BrokerWorkflows,
  InjectBroker,
  type ServiceBroker,
  TransactionalStep,
  Workflow,
} from "@shopana/shared-kernel";
import {
  projectOrderPaymentEvent,
  type PaymentDomainEvent,
} from "../../handlers/OrderPaymentEventHandlers.js";
import { Repository } from "../../repositories/Repository.js";

interface ProjectOrderPaymentEventInput {
  contractVersion: 1;
  event: PaymentDomainEvent;
}

const schema = z.object({
  contractVersion: z.literal(1),
  event: z
    .object({
      eventId: z.string().uuid(),
      eventType: z.string().startsWith("payment."),
      timestamp: z.string().datetime({ offset: true }),
      payload: z
        .object({
          organizationId: z.string().uuid(),
          storeId: z.string().uuid(),
          orderId: z.string().uuid(),
          paymentCollectionId: z.string().uuid(),
        })
        .passthrough(),
      context: z.object({ correlationId: z.string().uuid() }).passthrough(),
    })
    .passthrough(),
});

@Injectable()
export class ProjectOrderPaymentEventWorkflow extends BrokerWorkflows<
  ProjectOrderPaymentEventInput,
  void
> {
  constructor(
    @InjectBroker("order") broker: ServiceBroker,
    private readonly repository: Repository,
  ) {
    super(broker);
  }

  @Workflow("projectPaymentEventV1", { idempotencyStrategy: "content" })
  run(rawInput: ProjectOrderPaymentEventInput): Promise<void> {
    schema.parse(rawInput);
    return this.project(rawInput.event);
  }

  @TransactionalStep({
    txManager: (self: ProjectOrderPaymentEventWorkflow) => self.repository.txManager,
    bridge: (self: ProjectOrderPaymentEventWorkflow) => self.repository.dbosTransactionBridge,
  })
  private project(event: PaymentDomainEvent): Promise<void> {
    return projectOrderPaymentEvent(this.repository, event);
  }
}
