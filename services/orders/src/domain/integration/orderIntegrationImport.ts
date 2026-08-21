import type {
  OrderIntegrationImportDeliveryStatusV1,
  OrderIntegrationImportFulfillmentStatusV1,
  OrderIntegrationImportPaymentStatusV1,
  OrderIntegrationImportSnapshotV1,
} from "@shopana/broker-types";

/**
 * A channel app reconciles facts it owns in an external system, so the import
 * may only move state that carries no platform-side money or inventory
 * bookkeeping. Everything that needs cancellation, refund, void or restock
 * records stays with the order command that owns those records, which keeps
 * the canonical order auditable instead of app-writable.
 */
const importablePaymentStatuses: ReadonlySet<OrderIntegrationImportPaymentStatusV1> = new Set([
  "NOT_REQUIRED",
  "PENDING",
  "AUTHORIZED",
  "PARTIALLY_PAID",
  "PAID",
  "EXPIRED",
  "FAILED",
]);

const importableFulfillmentStatuses: ReadonlySet<OrderIntegrationImportFulfillmentStatusV1> =
  new Set(["UNFULFILLED", "SCHEDULED", "ON_HOLD", "PARTIALLY_FULFILLED", "FULFILLED"]);

/** Delivery state is a pure transport projection, so every value is importable. */
const importableDeliveryStatuses: ReadonlySet<OrderIntegrationImportDeliveryStatusV1> = new Set([
  "NOT_SHIPPED",
  "PARTIALLY_SHIPPED",
  "SHIPPED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DELIVERY_ATTEMPTED",
  "DELAYED",
  "EXCEPTION",
  "RETURNED_TO_SENDER",
  "CANCELLED",
]);

/**
 * Drafts are owned by Admin until they are placed, and a cancelled order is
 * terminal, so neither accepts imported state.
 */
export function assertImportableOrder(orderStatus: string): void {
  if (orderStatus === "DRAFT" || orderStatus === "CANCELLED") {
    throw new Error("ORDER_INTEGRATION_IMPORT_ORDER_NOT_IMPORTABLE");
  }
}

export function assertImportableSnapshot(snapshot: OrderIntegrationImportSnapshotV1): void {
  if (snapshot.paymentStatus && !importablePaymentStatuses.has(snapshot.paymentStatus)) {
    throw new Error("ORDER_INTEGRATION_IMPORT_STATUS_NOT_ALLOWED");
  }
  if (
    snapshot.fulfillmentStatus &&
    !importableFulfillmentStatuses.has(snapshot.fulfillmentStatus)
  ) {
    throw new Error("ORDER_INTEGRATION_IMPORT_STATUS_NOT_ALLOWED");
  }
  if (snapshot.deliveryStatus && !importableDeliveryStatuses.has(snapshot.deliveryStatus)) {
    throw new Error("ORDER_INTEGRATION_IMPORT_STATUS_NOT_ALLOWED");
  }
}

/**
 * Scales a captured amount to a new quantity with truncating integer maths, so
 * a reduced line keeps proportional tax, duty and discount instead of the
 * amounts captured for the original quantity.
 */
export function proratedMinorAmount(
  amountMinor: string,
  nextQuantity: number,
  currentQuantity: number,
): bigint {
  if (currentQuantity <= 0) throw new Error("ORDER_INTEGRATION_IMPORT_LINE_QUANTITY_INVALID");
  return (BigInt(amountMinor) * BigInt(nextQuantity)) / BigInt(currentQuantity);
}

/**
 * External systems reconcile removed or reduced items; growing a placed line
 * would create unpriced, unreserved goods, so only reductions are accepted.
 * Fulfilled and cancelled quantities are already booked elsewhere and set the
 * floor the imported quantity may not cross.
 */
export function assertImportableLineQuantity(
  nextQuantity: number,
  current: Readonly<{ quantity: number; cancelledQuantity: number; fulfilledQuantity: number }>,
): void {
  if (nextQuantity <= 0 || nextQuantity > current.quantity) {
    throw new Error("ORDER_INTEGRATION_IMPORT_LINE_QUANTITY_INVALID");
  }
  if (nextQuantity < current.cancelledQuantity + current.fulfilledQuantity) {
    throw new Error("ORDER_INTEGRATION_IMPORT_LINE_FULFILLED");
  }
}

/**
 * Mirrors the database line-total formula so a rounding artefact surfaces as a
 * domain error instead of a check-constraint violation.
 */
export function importedLineTotalMinor(
  subtotalMinor: bigint,
  discountMinor: bigint,
  taxMinor: bigint,
  dutyMinor: bigint,
): bigint {
  const total = subtotalMinor - discountMinor + taxMinor + dutyMinor;
  if (total < 0n) throw new Error("ORDER_INTEGRATION_IMPORT_LINE_AMOUNTS_INVALID");
  return total;
}
