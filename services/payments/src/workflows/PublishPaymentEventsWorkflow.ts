import { Injectable } from "@nestjs/common";
import type { EventEmitResult } from "@shopana/events";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  type ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { PaymentLifecycleRepository } from "../infrastructure/db/PaymentLifecycleRepository.js";

export type PublishPaymentEventsInput =
  | Readonly<{ source: "OPERATION"; operationId: string }>
  | Readonly<{ source: "PROVIDER_EVENT"; providerEventId: string }>;

@Injectable()
export class PublishPaymentEventsWorkflow extends BrokerWorkflows<
  PublishPaymentEventsInput,
  Readonly<{ published: number }>
> {
  constructor(
    @InjectBroker("payments") broker: ServiceBroker,
    private readonly repository: PaymentLifecycleRepository,
  ) {
    super(broker);
  }

  @Workflow("publishEvents", { idempotencyStrategy: "workflow" })
  async run(input: PublishPaymentEventsInput): Promise<Readonly<{ published: number }>> {
    const workflowId = DBOS.workflowID;
    if (!workflowId) throw new Error("PAYMENT_EVENT_WORKFLOW_CONTEXT_MISSING");
    const events = await this.load(input);
    for (const event of events) {
      await this.broker.runWorkflow<EventEmitResult>(
        "events.emit",
        {
          eventType: event.eventType,
          payload: event.payload,
          context: {
            organizationId: event.organizationId,
            correlationId: event.correlationId,
          },
          subject: {
            type:
              event.eventType === "payment.dispute.changed"
                ? "paymentDispute"
                : "paymentCollection",
            id: String(
              event.eventType === "payment.dispute.changed"
                ? event.payload.paymentDisputeId
                : event.payload.paymentCollectionId,
            ),
          },
          actor: { type: "service" },
          emitKey: event.eventKey,
        },
        {
          source: "workflow",
          organizationId: event.organizationId,
          workflowId,
          stepId: `emit:${event.eventType}`,
          callId: event.id,
        },
      );
      await this.markEmitted(event.id);
    }
    return { published: events.length };
  }

  @WorkflowStep()
  private load(input: PublishPaymentEventsInput) {
    return input.source === "OPERATION"
      ? this.repository.listPendingEvents(input.operationId)
      : this.repository.listPendingProviderEventEvents(input.providerEventId);
  }

  @WorkflowStep()
  private markEmitted(id: string) {
    return this.repository.markEventEmitted(id, new Date().toISOString());
  }
}
