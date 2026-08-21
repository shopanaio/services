import { Injectable } from "@nestjs/common";
import { z } from "zod";
import type { PaymentEvents } from "@shopana/broker-types";
import type { EventEmitResult } from "@shopana/events";
import { Money } from "@shopana/shared-money";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  type ServiceBroker,
  TransactionalStep,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import {
  projectOrderPaymentEvent,
  type PaymentDomainEvent,
} from "../../handlers/OrderPaymentEventHandlers.js";
import { Repository } from "../../repositories/Repository.js";
import { orderNotificationSnapshot } from "../../domain/order/customerNotification.js";

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
  async run(rawInput: ProjectOrderPaymentEventInput): Promise<void> {
    schema.parse(rawInput);
    await this.project(rawInput.event);
    await this.publishRefundedEvent(rawInput.event);
  }

  @TransactionalStep({
    txManager: (self: ProjectOrderPaymentEventWorkflow) => self.repository.txManager,
    bridge: (self: ProjectOrderPaymentEventWorkflow) => self.repository.dbosTransactionBridge,
  })
  private project(event: PaymentDomainEvent): Promise<void> {
    return projectOrderPaymentEvent(this.repository, event);
  }

  @WorkflowStep()
  private async publishRefundedEvent(event: PaymentDomainEvent): Promise<void> {
    if (event.eventType !== "payment.refunded") return;
    const refund = event.payload as PaymentEvents.Refunded;
    const facts = await this.repository.order.findNotificationFacts(refund.storeId, refund.orderId);
    if (!facts?.customerId) return;
    const workflowId = DBOS.workflowID;
    if (!workflowId) throw new Error("ORDER_REFUND_EVENT_WORKFLOW_CONTEXT_MISSING");
    await this.broker.runWorkflow<EventEmitResult>(
      "events.emit",
      {
        eventType: "orderRefunded",
        payload: {
          schemaVersion: 1,
          refundId: refund.operationId,
          refundRevision: 1,
          orderId: facts.orderId,
          orderRevision: facts.version,
          storeId: facts.storeId,
          customerId: facts.customerId,
          currencyCode: facts.currencyCode,
          refundedAmountMinor: refund.amount.amountMinor,
          refundedAt: refund.occurredAt,
          notification: orderNotificationSnapshot(facts, {
            refund: {
              id: refund.operationId,
              currencyCode: refund.amount.currencyCode,
              amount: Money.fromMinor(
                BigInt(refund.amount.amountMinor),
                refund.amount.currencyCode,
              ).toRoundedUnit(),
              refundedAt: refund.occurredAt,
            },
          }),
        },
        context: {
          organizationId: refund.organizationId,
          correlationId: event.context.correlationId,
        },
        subject: { type: "order", id: facts.orderId },
        actor: { type: "service" },
        emitKey: `order:${facts.orderId}`,
      },
      {
        source: "workflow",
        organizationId: refund.organizationId,
        workflowId,
        stepId: "emit:orderRefunded",
        callId: facts.orderId,
      },
    );
  }
}
