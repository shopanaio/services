import { Injectable } from "@nestjs/common";
import { DeliveryActionNames, DeliveryActions, type Delivery } from "@shopana/broker-types";
import { Action, BrokerActions, InjectBroker, type BrokerCallContext, type ServiceBroker, ZodSchema } from "@shopana/shared-kernel";
import { DeliveryShipmentService } from "../../application/shipments/DeliveryShipmentService.js";
import { DeliveryLifecycleActionSchemas, parseDeliveryProviderCompletionContext } from "../../contracts/schemas.js";

@Injectable()
export class DeliveryShipmentActions extends BrokerActions {
  constructor(@InjectBroker("delivery") broker: ServiceBroker, private readonly shipments: DeliveryShipmentService) { super(broker); }

  @Action(DeliveryActionNames.createShipment)
  @ZodSchema(DeliveryLifecycleActionSchemas.createShipment)
  create(params: Delivery.CreateDeliveryShipmentParams) {
    return this.broker.runWorkflow<Delivery.CreateDeliveryShipmentResult>("delivery.createShipment", params, workflowOptions("create", params.storeId, params.fulfillmentOrderId, params));
  }

  @Action(DeliveryActionNames.cancelShipment)
  @ZodSchema(DeliveryLifecycleActionSchemas.cancelShipment)
  cancel(params: Delivery.CancelDeliveryShipmentParams) {
    return this.broker.runWorkflow<Delivery.DeliveryOperationAcceptedResult>("delivery.cancelShipment", params, workflowOptions("cancel", params.storeId, params.shipmentId, params));
  }

  @Action(DeliveryActionNames.reconcileShipment)
  @ZodSchema(DeliveryLifecycleActionSchemas.reconcileShipment)
  reconcile(params: Delivery.ReconcileDeliveryShipmentParams) {
    return this.broker.runWorkflow<Delivery.DeliveryOperationAcceptedResult>("delivery.reconcileShipment", params, workflowOptions("reconcile", params.storeId, params.shipmentId, params));
  }

  @Action(DeliveryActionNames.getShipment)
  @ZodSchema(DeliveryLifecycleActionSchemas.getShipment)
  get(params: Delivery.GetDeliveryShipmentParams) { return this.shipments.get(params); }

  @Action(DeliveryActionNames.completeProviderOperation)
  @ZodSchema(DeliveryLifecycleActionSchemas.completeProviderOperation)
  async completeProviderOperation(params: Delivery.CompleteDeliveryProviderOperationParams, context: BrokerCallContext) {
    const trusted = parseDeliveryProviderCompletionContext(context, DeliveryActions.completeProviderOperation);
    const result = await this.shipments.completeProviderOperation(params, trusted);
    await this.startOutbox(trusted.organizationId, trusted.storeId, params.shipmentId, trusted.correlationId ?? params.providerEventId, params.providerEventId);
    return result;
  }

  @Action(DeliveryActionNames.reportProviderEvent)
  @ZodSchema(DeliveryLifecycleActionSchemas.reportProviderEvent)
  async reportProviderEvent(params: Delivery.ReportDeliveryProviderEventParams, context: BrokerCallContext) {
    const trusted = parseDeliveryProviderCompletionContext(context, DeliveryActions.reportProviderEvent);
    const result = await this.shipments.reportProviderEvent(params, trusted);
    await this.startOutbox(trusted.organizationId, trusted.storeId, result.shipmentId, trusted.correlationId ?? params.providerEventId, params.providerEventId);
    return result;
  }

  private startOutbox(organizationId: string, storeId: string, shipmentId: string, correlationId: string, callId: string) {
    return this.broker.startWorkflow("delivery.publishShipmentOutbox", { organizationId, storeId, shipmentId, correlationId }, {
      source: "content", organizationId, resourceId: shipmentId,
      operation: "delivery.publishShipmentOutbox", content: { shipmentId, callId },
    });
  }
}

function workflowOptions(operation: string, storeId: string, resourceId: string, params: { idempotencyKey: string }) {
  return { source: "content" as const, resourceId, operation: `delivery.${operation}`, content: { storeId, ...params } };
}
