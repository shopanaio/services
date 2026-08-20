import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type {
  OrderFulfillmentStatusModalPayload,
  OrderModalPayload,
  OrderShippingItemModalPayload,
} from "@/domains/sales/all-orders/modals";
import type { OrderFulfillmentStatus } from "@/domains/sales/all-orders/graphql/operation-types";

export const FULFILLMENT_STAGE_MODAL_TYPE = "fulfillment-stage";
export const FULFILLMENT_ORDER_MODAL_TYPE = "fulfillment-order";
export const FULFILLMENT_STATUS_MODAL_TYPE = "fulfillment-status";
export const FULFILLMENT_TRACKING_MODAL_TYPE = "fulfillment-tracking";

export interface FulfillmentStageModalPayload extends IModalStackPayload {
  mode: "create" | "edit";
  entityId?: string;
  initialSortIndex?: number;
  onSaved?: () => Promise<unknown> | unknown;
}
export type FulfillmentOrderModalPayload = OrderModalPayload;
export interface FulfillmentStatusModalPayload extends OrderFulfillmentStatusModalPayload {
  targetStatus?: OrderFulfillmentStatus;
}
export type FulfillmentTrackingModalPayload = OrderShippingItemModalPayload;

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [FULFILLMENT_STAGE_MODAL_TYPE]: FulfillmentStageModalPayload;
    [FULFILLMENT_ORDER_MODAL_TYPE]: FulfillmentOrderModalPayload;
    [FULFILLMENT_STATUS_MODAL_TYPE]: FulfillmentStatusModalPayload;
    [FULFILLMENT_TRACKING_MODAL_TYPE]: FulfillmentTrackingModalPayload;
  }
}

export const useFulfillmentStageModal = createModalStackHook(FULFILLMENT_STAGE_MODAL_TYPE);
export const useFulfillmentOrderModal = createModalStackHook(FULFILLMENT_ORDER_MODAL_TYPE);
export const useFulfillmentStatusModal = createModalStackHook(FULFILLMENT_STATUS_MODAL_TYPE);
export const useFulfillmentTrackingModal = createModalStackHook(FULFILLMENT_TRACKING_MODAL_TYPE);
