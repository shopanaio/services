import type { AdminOrderCommandName } from "../../domain/admin/AdminOrderCommandContracts.js";

export const operationKinds: Partial<Record<AdminOrderCommandName, string>> = {
  orderCancel: "ORDER_CANCEL",
  orderEditCommit: "ORDER_EDIT_COMMIT",
  orderPaymentCapture: "PAYMENT_CAPTURE",
  orderPaymentVoid: "PAYMENT_VOID",
  orderPaymentRetry: "PAYMENT_RETRY",
  orderRefundCreate: "PAYMENT_REFUND",
  fulfillmentOrderSubmit: "FULFILLMENT_SUBMIT",
  fulfillmentOrderCancelRequest: "FULFILLMENT_CANCEL",
  fulfillmentCancel: "FULFILLMENT_CANCEL",
  shipmentCreate: "SHIPMENT_CREATE",
  shipmentCancel: "SHIPMENT_CANCEL",
  shipmentReconcile: "SHIPMENT_RECONCILE",
  orderReturnReceive: "RETURN_RECEIVE",
  orderIntegrationSyncRequest: "INTEGRATION_SYNC",
  orderIntegrationSyncRetry: "INTEGRATION_SYNC",
  ordersBulkAction: "BULK_ACTION",
};
