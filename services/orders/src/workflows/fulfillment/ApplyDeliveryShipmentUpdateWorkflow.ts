import { Injectable } from "@nestjs/common";
import type {
  ApplyOrderDeliveryShipmentUpdateParams,
  ApplyOrderDeliveryShipmentUpdateResult,
} from "@shopana/broker-types";
import {
  BrokerWorkflows,
  InjectBroker,
  type ServiceBroker,
  TransactionalStep,
  Workflow,
} from "@shopana/shared-kernel";
import { z } from "zod";
import { Repository } from "../../repositories/Repository.js";

const schema = z.object({
  storeId: z.string().uuid(),
  update: z
    .object({
      fulfillmentOrderId: z.string().uuid(),
      expectedFulfillmentOrderRevision: z.number().int().positive(),
      shipmentId: z.string().min(1),
      shipmentRevision: z.number().int().nonnegative(),
      state: z.enum([
        "SHIPMENT_CREATED",
        "IN_TRANSIT",
        "DELIVERED",
        "DELIVERY_FAILED",
        "CANCELLED",
      ]),
      occurredAt: z.string().datetime({ offset: true }),
      lineItems: z.array(
        z.object({
          fulfillmentOrderLineItemId: z.string().min(1),
          quantity: z.number().int().positive(),
        }),
      ),
    })
    .passthrough(),
});

@Injectable()
export class ApplyDeliveryShipmentUpdateWorkflow extends BrokerWorkflows<
  ApplyOrderDeliveryShipmentUpdateParams,
  ApplyOrderDeliveryShipmentUpdateResult
> {
  constructor(
    @InjectBroker("order") broker: ServiceBroker,
    private readonly repository: Repository,
  ) {
    super(broker);
  }

  @Workflow("applyDeliveryShipmentUpdate", { idempotencyStrategy: "content" })
  run(
    rawInput: ApplyOrderDeliveryShipmentUpdateParams,
  ): Promise<ApplyOrderDeliveryShipmentUpdateResult> {
    schema.parse(rawInput);
    return this.apply(rawInput);
  }

  @TransactionalStep({
    txManager: (self: ApplyDeliveryShipmentUpdateWorkflow) => self.repository.txManager,
    bridge: (self: ApplyDeliveryShipmentUpdateWorkflow) => self.repository.dbosTransactionBridge,
  })
  private apply(
    input: ApplyOrderDeliveryShipmentUpdateParams,
  ): Promise<ApplyOrderDeliveryShipmentUpdateResult> {
    return this.repository.fulfillment.applyShipmentUpdate(input);
  }
}
