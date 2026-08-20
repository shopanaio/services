import { Injectable } from "@nestjs/common";
import type { Delivery } from "@shopana/broker-types";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  type ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import {
  DeliveryShipmentService,
  type PreparedShipmentOperation,
} from "../application/shipments/DeliveryShipmentService.js";

@Injectable()
export class CreateDeliveryShipmentWorkflow extends BrokerWorkflows<
  Delivery.CreateDeliveryShipmentParams,
  Delivery.CreateDeliveryShipmentResult
> {
  constructor(
    @InjectBroker("delivery") broker: ServiceBroker,
    private readonly shipments: DeliveryShipmentService,
  ) {
    super(broker);
  }

  @Workflow("createShipment", { idempotencyStrategy: "content" })
  async run(
    input: Delivery.CreateDeliveryShipmentParams,
  ): Promise<Delivery.CreateDeliveryShipmentResult> {
    const prepared = await this.prepare(input, new Date(await DBOS.now()).toISOString());
    if ("providerNotConfigured" in prepared)
      return {
        status: "SHIPMENT_PROVIDER_NOT_CONFIGURED",
        fulfillmentOrderId: input.fulfillmentOrderId,
        workflowId: DBOS.workflowID!,
        duplicate: prepared.duplicate,
      };
    await publishOutbox(this.broker, prepared.shipment, input.correlationId, "prepared");
    if (prepared.operation.state === "PROCESSING") {
      const result = await this.invoke(prepared);
      await this.complete(prepared, result, input.correlationId);
    }
    await publishOutbox(this.broker, prepared.shipment, input.correlationId, "completed");
    return {
      status: "ACCEPTED",
      shipmentId: prepared.shipment.shipmentId,
      operationId: prepared.operation.operationId,
      workflowId: DBOS.workflowID!,
      duplicate: prepared.duplicate,
    };
  }

  @WorkflowStep() private prepare(input: Delivery.CreateDeliveryShipmentParams, now: string) {
    return this.shipments.prepareCreate(input, now);
  }
  @WorkflowStep({
    timeoutMs: 125_000,
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private async invoke(
    prepared: PreparedShipmentOperation,
  ): Promise<Delivery.DeliveryProviderShipmentOperationResult<"CREATE">> {
    return (await this.shipments.invoke(
      prepared,
    )) as Delivery.DeliveryProviderShipmentOperationResult<"CREATE">;
  }
  @WorkflowStep() private complete(
    prepared: PreparedShipmentOperation,
    result: Delivery.DeliveryProviderShipmentOperationResult,
    correlationId: string,
  ) {
    return this.shipments.complete(prepared, result, correlationId);
  }
}

@Injectable()
export class CancelDeliveryShipmentWorkflow extends BrokerWorkflows<
  Delivery.CancelDeliveryShipmentParams,
  Delivery.DeliveryOperationAcceptedResult
> {
  constructor(
    @InjectBroker("delivery") broker: ServiceBroker,
    private readonly shipments: DeliveryShipmentService,
  ) {
    super(broker);
  }

  @Workflow("cancelShipment", { idempotencyStrategy: "content" })
  async run(
    input: Delivery.CancelDeliveryShipmentParams,
  ): Promise<Delivery.DeliveryOperationAcceptedResult> {
    const prepared = await this.prepare(input, new Date(await DBOS.now()).toISOString());
    await publishOutbox(this.broker, prepared.shipment, input.correlationId, "prepared");
    if (prepared.operation.state === "PROCESSING") {
      const result = await this.invoke(prepared);
      await this.complete(prepared, result, input.correlationId);
    }
    await publishOutbox(this.broker, prepared.shipment, input.correlationId, "completed");
    return {
      status: "ACCEPTED",
      shipmentId: prepared.shipment.shipmentId,
      operationId: prepared.operation.operationId,
      workflowId: DBOS.workflowID!,
      duplicate: prepared.duplicate,
    };
  }
  @WorkflowStep() private prepare(input: Delivery.CancelDeliveryShipmentParams, now: string) {
    return this.shipments.prepareCancel(input, now);
  }
  @WorkflowStep({
    timeoutMs: 125_000,
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private async invoke(
    prepared: PreparedShipmentOperation,
  ): Promise<Delivery.DeliveryProviderShipmentOperationResult<"CANCEL">> {
    return (await this.shipments.invoke(
      prepared,
    )) as Delivery.DeliveryProviderShipmentOperationResult<"CANCEL">;
  }
  @WorkflowStep() private complete(
    prepared: PreparedShipmentOperation,
    result: Delivery.DeliveryProviderShipmentOperationResult<"CANCEL">,
    correlationId: string,
  ) {
    return this.shipments.complete(prepared, result, correlationId);
  }
}

@Injectable()
export class ReconcileDeliveryShipmentWorkflow extends BrokerWorkflows<
  Delivery.ReconcileDeliveryShipmentParams,
  Delivery.DeliveryOperationAcceptedResult
> {
  constructor(
    @InjectBroker("delivery") broker: ServiceBroker,
    private readonly shipments: DeliveryShipmentService,
  ) {
    super(broker);
  }

  @Workflow("reconcileShipment", { idempotencyStrategy: "content" })
  async run(
    input: Delivery.ReconcileDeliveryShipmentParams,
  ): Promise<Delivery.DeliveryOperationAcceptedResult> {
    const prepared = await this.prepare(input, new Date(await DBOS.now()).toISOString());
    await publishOutbox(this.broker, prepared.shipment, input.correlationId, "prepared");
    if (prepared.operation.state === "PROCESSING") {
      const result = await this.invoke(prepared);
      await this.complete(prepared, result, input.correlationId);
    }
    await publishOutbox(this.broker, prepared.shipment, input.correlationId, "completed");
    return {
      status: "ACCEPTED",
      shipmentId: prepared.shipment.shipmentId,
      operationId: prepared.operation.operationId,
      workflowId: DBOS.workflowID!,
      duplicate: prepared.duplicate,
    };
  }
  @WorkflowStep() private prepare(input: Delivery.ReconcileDeliveryShipmentParams, now: string) {
    return this.shipments.prepareReconcile(input, now);
  }
  @WorkflowStep({
    timeoutMs: 125_000,
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private async invoke(
    prepared: PreparedShipmentOperation,
  ): Promise<Delivery.DeliveryProviderReconcileShipmentResult> {
    return (await this.shipments.invoke(
      prepared,
    )) as Delivery.DeliveryProviderReconcileShipmentResult;
  }
  @WorkflowStep() private complete(
    prepared: PreparedShipmentOperation,
    result: Delivery.DeliveryProviderReconcileShipmentResult,
    correlationId: string,
  ) {
    return this.shipments.complete(prepared, result, correlationId);
  }
}

function publishOutbox(
  broker: ServiceBroker,
  shipment: Delivery.DeliveryShipmentSnapshot,
  correlationId: string,
  phase: "prepared" | "completed",
) {
  return broker.runWorkflow(
    "delivery.publishShipmentOutbox",
    {
      organizationId: shipment.organizationId,
      storeId: shipment.storeId,
      shipmentId: shipment.shipmentId,
      correlationId,
    },
    {
      source: "workflow",
      workflowId: DBOS.workflowID!,
      stepId: `publishShipmentOutbox:${phase}`,
      callId: `${shipment.shipmentId}:${phase}`,
      organizationId: shipment.organizationId,
    },
  );
}
