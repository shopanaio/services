import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type {
  OrderFulfillmentStatus,
  OrderPaymentStatus,
  OrderStatus,
} from "./graphql/operation-types";
export interface OrderModalPayload extends IModalStackPayload {
  mode: "create" | "edit";
  entityId?: string;
  onSaved?: () => Promise<unknown> | unknown;
}
export interface OrderStatusModalPayload extends IModalStackPayload {
  entityId: string;
  expectedVersion: number;
  nextStatus: OrderStatus;
  onSaved?: () => Promise<unknown> | unknown;
}
export interface OrderPaymentStatusModalPayload extends IModalStackPayload {
  orderId: string;
  paymentItemId: string;
  expectedVersion: number;
  currentStatus: OrderPaymentStatus;
  nextStatus: OrderPaymentStatus;
  onSaved?: () => Promise<unknown> | unknown;
}
export interface OrderFulfillmentStatusModalPayload extends IModalStackPayload {
  orderId: string;
  fulfillmentId: string;
  expectedVersion: number;
  currentStatus: OrderFulfillmentStatus;
  nextStatus: OrderFulfillmentStatus;
  onSaved?: () => Promise<unknown> | unknown;
}
export interface OrderShippingItemModalPayload extends IModalStackPayload {
  mode: "create" | "edit";
  orderId: string;
  fulfillmentId: string;
  shippingItemId?: string;
  expectedVersion: number;
  shippingMethodId?: string;
  trackingCode?: string | null;
  onSaved?: () => Promise<unknown> | unknown;
}
export interface OrderDetailsModalPayload extends IModalStackPayload {
  orderId: string;
  expectedVersion: number;
  onSaved?: () => Promise<unknown> | unknown;
}
declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    order: OrderModalPayload;
    "order-status": OrderStatusModalPayload;
    "order-payment-status": OrderPaymentStatusModalPayload;
    "order-fulfillment-status": OrderFulfillmentStatusModalPayload;
    "order-shipping-item": OrderShippingItemModalPayload;
    "order-shipping-details": OrderDetailsModalPayload;
    "order-payment-details": OrderDetailsModalPayload;
  }
}
export const useOrderModal = createModalStackHook("order");
export const useOrderStatusModal = createModalStackHook("order-status");
export const useOrderPaymentStatusModal = createModalStackHook("order-payment-status");
export const useOrderFulfillmentStatusModal = createModalStackHook("order-fulfillment-status");
export const useOrderShippingItemModal = createModalStackHook("order-shipping-item");
export const useOrderShippingDetailsModal = createModalStackHook("order-shipping-details");
export const useOrderPaymentDetailsModal = createModalStackHook("order-payment-details");
