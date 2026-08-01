import type { Delivery } from "@shopana/broker-types";

/** Orders/fulfillment boundary; returned plans are the only trusted shipment facts. */
export interface DeliveryFulfillmentPort {
  getShipmentPlan(input: Readonly<{
    storeId: string;
    fulfillmentId: string;
    expectedFulfillmentRevision: number;
  }>): Promise<Delivery.DeliveryFulfillmentAvailability>;

  applyShipmentUpdate(
    update: Delivery.DeliveryFulfillmentShipmentUpdate,
  ): Promise<
    | Readonly<{ status: "APPLIED"; fulfillmentRevision: number }>
    | Readonly<{ status: "DUPLICATE"; fulfillmentRevision: number }>
    | Readonly<{ status: "REVISION_CONFLICT"; fulfillmentRevision: number }>
  >;
}
