import type {
  DeliveryProviderContact,
  DeliveryProviderDestination,
  DeliveryProviderOrigin,
  DeliveryProviderPackage,
} from "./delivery.js";

/** Orders-owned allocation fact consumed by Delivery; Delivery never reallocates it. */
export interface DeliveryFulfillmentLineAllocation {
  fulfillmentLineId: string;
  orderLineId: string;
  checkoutLineId: string;
  variantId: string;
  quantity: number;
}

/** Trusted shipment plan read from the fulfillment bounded context. */
export interface DeliveryFulfillmentPlanSnapshot {
  fulfillmentId: string;
  fulfillmentRevision: number;
  organizationId: string;
  storeId: string;
  orderId: string;
  checkoutId: string;
  deliveryGroupId: string;
  origin: DeliveryProviderOrigin;
  destination: DeliveryProviderDestination;
  sender: DeliveryProviderContact;
  recipient: DeliveryProviderContact;
  allocations: readonly DeliveryFulfillmentLineAllocation[];
  packages: readonly DeliveryProviderPackage[];
  planHash: string;
  fulfillAt: string | null;
  fulfillBy: string | null;
}

export type DeliveryFulfillmentAvailability =
  | Readonly<{
      status: "READY";
      plan: DeliveryFulfillmentPlanSnapshot;
    }>
  | Readonly<{
      status: "ON_HOLD" | "CLOSED" | "REVISION_CONFLICT";
      code: string;
      message: string;
      currentRevision: number;
    }>;

export interface DeliveryFulfillmentShipmentUpdate {
  fulfillmentId: string;
  expectedFulfillmentRevision: number;
  shipmentId: string;
  shipmentRevision: number;
  state:
    | "SHIPMENT_CREATED"
    | "IN_TRANSIT"
    | "DELIVERED"
    | "DELIVERY_FAILED"
    | "CANCELLED";
  occurredAt: string;
}
