import { Injectable } from "@nestjs/common";
import { BrokerWorkflows, DBOS, InjectBroker, type ServiceBroker, Workflow, WorkflowStep } from "@shopana/shared-kernel";
import type { Repository } from "../repositories/Repository.js";

export interface DeliveryShipmentOutboxWorkflowInput {
  organizationId: string;
  storeId: string;
  shipmentId: string;
  correlationId: string;
}

@Injectable()
export class DeliveryShipmentOutboxWorkflow extends BrokerWorkflows<DeliveryShipmentOutboxWorkflowInput, void> {
  constructor(@InjectBroker("delivery") broker: ServiceBroker, private readonly repository: Repository) { super(broker); }

  @Workflow("publishShipmentOutbox", { idempotencyStrategy: "workflow" })
  async run(input: DeliveryShipmentOutboxWorkflowInput): Promise<void> {
    const pending = await this.load(input.storeId, input.shipmentId);
    for (const row of pending) {
      await this.broker.runWorkflow("events.emit", {
        eventType: row.event.type,
        payload: row.event.payload,
        context: { organizationId: input.organizationId, correlationId: input.correlationId },
        subject: { type: "deliveryShipment", id: input.shipmentId },
        actor: { type: "service", id: "delivery" },
        emitKey: `delivery-shipment:${input.shipmentId}`,
      }, {
        source: "workflow", workflowId: DBOS.workflowID!, stepId: `emit:${row.event.type}`,
        callId: row.id, tenantId: input.organizationId,
      });
      await this.mark(row.id, new Date(await DBOS.now()).toISOString());
    }
  }

  @WorkflowStep() private load(storeId: string, shipmentId: string) { return this.repository.shipments.listPendingOutbox(storeId, shipmentId); }
  @WorkflowStep() private mark(id: string, emittedAt: string) { return this.repository.shipments.markOutboxEmitted(id, emittedAt); }
}
