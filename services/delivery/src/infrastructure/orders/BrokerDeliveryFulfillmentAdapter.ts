import { OrderFulfillmentActions, type Orders } from "@shopana/broker-types";
import type { ServiceBroker } from "@shopana/shared-kernel";
import type { DeliveryFulfillmentPort } from "../../contracts/fulfillment.js";
import {
  parseDeliveryFulfillmentShipmentUpdate,
  parseDeliveryShipmentPlanAvailability,
} from "../../contracts/fulfillment-schemas.js";

export class BrokerDeliveryFulfillmentAdapter implements DeliveryFulfillmentPort {
  constructor(private readonly broker: ServiceBroker) {}

  async getShipmentPlan(input: Orders.GetOrderDeliveryShipmentPlanParams) {
    const result = await this.broker.call<Orders.GetOrderDeliveryShipmentPlanResult>(
      OrderFulfillmentActions.getShipmentPlan,
      input,
    );
    return parseDeliveryShipmentPlanAvailability(result);
  }

  async applyShipmentUpdate(input: Parameters<DeliveryFulfillmentPort["applyShipmentUpdate"]>[0]) {
    const parsed = parseDeliveryFulfillmentShipmentUpdate(input.update);
    return this.broker.call<Orders.ApplyOrderDeliveryShipmentUpdateResult>(
      OrderFulfillmentActions.applyShipmentUpdate,
      { storeId: input.storeId, update: parsed },
    );
  }
}
