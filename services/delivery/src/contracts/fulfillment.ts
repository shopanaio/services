import type { Delivery } from "@shopana/broker-types";

/** Orders/fulfillment boundary; returned plans are the only trusted shipment facts. */
export interface DeliveryFulfillmentPort {
  getShipmentPlan(
    input: Readonly<{
      storeId: string;
      fulfillmentOrderId: string;
      expectedFulfillmentOrderRevision: number;
      /** Null selects every remaining physical line; an explicit subset enables partial fulfillment. */
      lineItems:
        | readonly [
            Delivery.DeliveryFulfillmentOrderLineItemInput,
            ...Delivery.DeliveryFulfillmentOrderLineItemInput[],
          ]
        | null;
    }>,
  ): Promise<Delivery.DeliveryShipmentPlanAvailability>;

  applyShipmentUpdate(
    input: Readonly<{
      storeId: string;
      update: Delivery.DeliveryFulfillmentShipmentUpdate;
    }>,
  ): Promise<
    | Readonly<{ status: "APPLIED"; fulfillmentOrderRevision: number }>
    | Readonly<{ status: "DUPLICATE"; fulfillmentOrderRevision: number }>
    | Readonly<{
        status: "REVISION_CONFLICT";
        fulfillmentOrderRevision: number;
      }>
  >;
}

/** Shopify-style request lifecycle owned by the fulfillment bounded context. */
export interface DeliveryFulfillmentOrderLifecyclePort {
  submitFulfillmentRequest(
    input: Readonly<{
      storeId: string;
      fulfillmentOrderId: string;
      expectedRevision: number;
      /** Null requests all remaining line items; a subset can split the order. */
      lineItems:
        | readonly [
            Delivery.DeliveryFulfillmentOrderLineItemInput,
            ...Delivery.DeliveryFulfillmentOrderLineItemInput[],
          ]
        | null;
      message: string | null;
      notifyCustomer: boolean;
      idempotencyKey: string;
    }>,
  ): Promise<Delivery.DeliverySubmitFulfillmentRequestResult>;

  acceptFulfillmentRequest(
    input: Readonly<{
      storeId: string;
      fulfillmentOrderId: string;
      expectedRevision: number;
      message: string | null;
      estimatedShippedAt: string | null;
      idempotencyKey: string;
    }>,
  ): Promise<Delivery.DeliveryFulfillmentOrderMutationResult>;

  rejectFulfillmentRequest(
    input: Readonly<{
      storeId: string;
      fulfillmentOrderId: string;
      expectedRevision: number;
      reason: Delivery.DeliveryFulfillmentOrderRejectionReason | null;
      lineItems: readonly Delivery.DeliveryIncomingRequestLineItemInput[] | null;
      message: string | null;
      idempotencyKey: string;
    }>,
  ): Promise<Delivery.DeliveryFulfillmentOrderMutationResult>;

  submitCancellationRequest(
    input: Readonly<{
      storeId: string;
      fulfillmentOrderId: string;
      expectedRevision: number;
      message: string | null;
      idempotencyKey: string;
    }>,
  ): Promise<Delivery.DeliveryFulfillmentOrderMutationResult>;

  acceptCancellationRequest(
    input: Readonly<{
      storeId: string;
      fulfillmentOrderId: string;
      expectedRevision: number;
      message: string | null;
      idempotencyKey: string;
    }>,
  ): Promise<Delivery.DeliveryFulfillmentOrderMutationResult>;

  rejectCancellationRequest(
    input: Readonly<{
      storeId: string;
      fulfillmentOrderId: string;
      expectedRevision: number;
      message: string | null;
      idempotencyKey: string;
    }>,
  ): Promise<Delivery.DeliveryFulfillmentOrderMutationResult>;

  holdFulfillmentOrder(
    input: Readonly<{
      storeId: string;
      fulfillmentOrderId: string;
      expectedRevision: number;
      reason: Delivery.DeliveryFulfillmentOrderHoldSnapshot["reason"];
      reasonNotes: string | null;
      idempotencyKey: string;
    }>,
  ): Promise<Delivery.DeliveryFulfillmentOrderMutationResult>;

  releaseFulfillmentOrderHold(
    input: Readonly<{
      storeId: string;
      fulfillmentOrderId: string;
      expectedRevision: number;
      holdId: string;
      idempotencyKey: string;
    }>,
  ): Promise<Delivery.DeliveryFulfillmentOrderMutationResult>;

  moveFulfillmentOrder(
    input: Readonly<{
      storeId: string;
      fulfillmentOrderId: string;
      expectedRevision: number;
      /** Null moves the whole order; a subset splits the remaining allocation. */
      lineItems:
        | readonly [
            Delivery.DeliveryFulfillmentOrderLineItemInput,
            ...Delivery.DeliveryFulfillmentOrderLineItemInput[],
          ]
        | null;
      assignedLocation: Delivery.DeliveryFulfillmentOrderAssignedLocation;
      idempotencyKey: string;
    }>,
  ): Promise<Delivery.DeliveryMoveFulfillmentOrderResult>;

  mergeFulfillmentOrders(
    input: Readonly<{
      storeId: string;
      fulfillmentOrders: readonly [
        Readonly<{ fulfillmentOrderId: string; expectedRevision: number }>,
        Readonly<{ fulfillmentOrderId: string; expectedRevision: number }>,
        ...Readonly<{
          fulfillmentOrderId: string;
          expectedRevision: number;
        }>[],
      ];
      idempotencyKey: string;
    }>,
  ): Promise<Delivery.DeliveryMergeFulfillmentOrdersResult>;

  closeFulfillmentOrder(
    input: Readonly<{
      storeId: string;
      fulfillmentOrderId: string;
      expectedRevision: number;
      message: string | null;
      idempotencyKey: string;
    }>,
  ): Promise<Delivery.DeliveryFulfillmentOrderMutationResult>;

  markFulfillmentOrderIncomplete(
    input: Readonly<{
      storeId: string;
      fulfillmentOrderId: string;
      expectedRevision: number;
      message: string | null;
      idempotencyKey: string;
    }>,
  ): Promise<Delivery.DeliveryFulfillmentOrderMutationResult>;
}
