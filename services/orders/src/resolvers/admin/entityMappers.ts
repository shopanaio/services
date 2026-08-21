import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import {
  encodeId,
  money,
  nullableString,
  numberValue,
  rowValue,
  rowsValue,
  stringValue,
  value,
  type Row,
} from "./values.js";

export function mapLine(row: Row, currencyCode: string) {
  const snapshot = rowValue(row, "purchasableSnapshot") ?? {};
  const quantity = numberValue(row, "quantity");
  const cancelled = numberValue(row, "cancelledQuantity");
  return {
    id: encodeId(stringValue(row, "id"), GlobalIdEntity.OrderLine),
    parentLine: null,
    purchasableId: encodeOptionalTarget(
      nullableString(row, "purchasableId"),
      stringValue(row, "purchasableType", "Variant"),
    ),
    productId: encodeId(value(snapshot, "productId"), GlobalIdEntity.Product),
    variantId: encodeId(
      value(snapshot, "variantId") ?? value(row, "purchasableId"),
      GlobalIdEntity.Variant,
    ),
    title: stringValue(row, "title"),
    sku: nullableString(row, "sku"),
    imageUrl: nullableString(row, "imageUrl"),
    quantity,
    cancelledQuantity: cancelled,
    fulfillableQuantity: Math.max(0, quantity - cancelled),
    fulfilledQuantity: 0,
    returnableQuantity: 0,
    returnedQuantity: 0,
    refundableQuantity: Math.max(0, quantity - cancelled),
    requiresShipping: value(row, "requiresShipping") !== false,
    taxable: value(row, "taxable") !== false,
    weight: mapWeight(snapshot),
    unitCost:
      value(snapshot, "unitCostAmount") == null
        ? null
        : money(value(snapshot, "unitCostAmount"), currencyCode),
    cost: {
      unitPrice: money(value(row, "unitPriceAmount"), currencyCode),
      unitCompareAtPrice:
        value(row, "unitCompareAtPriceAmount") == null
          ? null
          : money(value(row, "unitCompareAtPriceAmount"), currencyCode),
      subtotalAmount: money(value(row, "subtotalAmount"), currencyCode),
      discountAmount: money(value(row, "discountAmount"), currencyCode),
      taxAmount: money(value(row, "taxAmount"), currencyCode),
      dutyAmount: money(value(row, "dutyAmount"), currencyCode),
      totalAmount: money(value(row, "totalAmount"), currencyCode),
    },
    purchasableSnapshot: snapshot,
    customFields: rowValue(row, "metadata") ?? {},
    createdAt: stringValue(row, "createdAt"),
    updatedAt: stringValue(row, "updatedAt"),
  };
}

export function mapDiscount(row: Row, currencyCode: string) {
  return {
    id: encodeId(stringValue(row, "id"), GlobalIdEntity.OrderDiscount),
    code: nullableString(row, "code"),
    title: stringValue(row, "title"),
    source: nullableString(row, "provider") ?? "MANUAL",
    target: stringValue(row, "targetType"),
    value: String(value(row, "valuePercentage") ?? value(row, "valueAmount") ?? 0),
    amount: money(value(row, "totalAllocatedAmount"), currencyCode),
    metadata: rowValue(row, "metadata") ?? {},
  };
}

export function mapTaxLine(row: Row, currencyCode: string) {
  return {
    id: encodeId(stringValue(row, "id"), GlobalIdEntity.OrderTaxLine),
    title: stringValue(row, "title"),
    rate: String(value(row, "rate") ?? 0),
    amount: money(value(row, "amount"), currencyCode),
    included: value(row, "channelLiable") === true,
    jurisdiction: nullableString(row, "jurisdictionCode"),
  };
}

export function mapPayment(order: Row, currencyCode: string) {
  const methods = rowsValue(order, "paymentMethods");
  const attempts = rowsValue(order, "paymentAttempts");
  const transactions = rowsValue(order, "paymentTransactions");
  const disputes = rowsValue(order, "paymentDisputes");
  const successful = transactions.filter((item) => stringValue(item, "status") === "SUCCESS");
  const sum = (...kinds: string[]) =>
    successful
      .filter((item) => kinds.includes(stringValue(item, "kind")))
      .reduce((total, item) => total + BigInt(String(value(item, "amount") ?? 0)), 0n);
  const captured = sum("CAPTURE", "SALE", "MANUAL");
  const refunded = sum("REFUND");
  const total = BigInt(String(value(order, "totalAmount") ?? 0));
  return {
    status: stringValue(order, "paymentStatus"),
    selectedMethod: mapPaymentMethod(
      methods.find((method) => value(method, "isSelected") === true) ?? methods[0],
    ),
    authorizedAmount: money(sum("AUTHORIZATION"), currencyCode),
    capturedAmount: money(captured, currencyCode),
    refundedAmount: money(refunded, currencyCode),
    voidedAmount: money(sum("VOID"), currencyCode),
    outstandingAmount: money(
      total > captured - refunded ? total - captured + refunded : 0n,
      currencyCode,
    ),
    attempts: attempts.map((item) => ({
      id: encodeId(stringValue(item, "id"), GlobalIdEntity.OrderPaymentAttempt),
      status: mapAttemptStatus(stringValue(item, "status")),
      requestedAmount: money(value(item, "requestedAmount"), currencyCode),
      providerCode:
        mapPaymentMethod(
          methods.find(
            (method) => stringValue(method, "id") === stringValue(item, "paymentMethodId"),
          ),
        )?.providerCode ?? "unknown",
      providerReference: nullableString(item, "providerAttemptId"),
      failureCode: nullableString(item, "failureCode"),
      failureMessage: nullableString(item, "failureMessage"),
      customerAction: value(item, "customerActionPayload") ?? null,
      expiresAt: nullableString(item, "expiresAt"),
      processedAt: nullableString(item, "processedAt"),
      createdAt: stringValue(item, "createdAt"),
      updatedAt: stringValue(item, "updatedAt"),
    })),
    transactions: transactions.map((item) => ({
      id: encodeId(stringValue(item, "id"), GlobalIdEntity.OrderPaymentTransaction),
      kind: stringValue(item, "kind"),
      status: stringValue(item, "status"),
      amount: money(value(item, "amount"), currencyCode),
      providerCode: stringValue(item, "provider"),
      providerReference: nullableString(item, "providerTransactionId"),
      parentTransaction: null,
      failureCode: nullableString(item, "failureCode"),
      failureMessage: nullableString(item, "failureMessage"),
      processedAt: nullableString(item, "processedAt"),
      createdAt: stringValue(item, "createdAt"),
    })),
    disputes: disputes.map((item) => ({
      id: encodeId(stringValue(item, "id"), GlobalIdEntity.OrderPaymentDispute),
      providerCode: stringValue(item, "provider"),
      providerReference: stringValue(item, "providerDisputeId"),
      status: stringValue(item, "status"),
      reason: nullableString(item, "reason"),
      amount: money(value(item, "amount"), currencyCode),
      responseDueAt: nullableString(item, "responseDueAt"),
      resolvedAt: nullableString(item, "resolvedAt"),
      createdAt: stringValue(item, "createdAt"),
      updatedAt: stringValue(item, "updatedAt"),
    })),
  };
}

export function mapFulfillmentOrder(row: Row, orderId: string) {
  const providerSnapshot = rowValue(row, "providerSnapshot") ?? {};
  const snapshot = rowValue(providerSnapshot, "snapshot") ?? providerSnapshot;
  const assignedLocation = rowValue(snapshot, "assignedLocation") ?? {};
  return {
    id: encodeId(stringValue(row, "id"), GlobalIdEntity.FulfillmentOrder),
    order: { id: orderId },
    deliveryGroup: {
      id: encodeId(stringValue(row, "deliveryGroupId"), GlobalIdEntity.OrderDeliveryGroup),
    },
    status: stringValue(row, "status"),
    requestStatus: stringValue(row, "requestStatus"),
    lines: [],
    assignedLocationId:
      encodeOptionalTarget(nullableString(row, "assignedLocationId"), "Location") ??
      composeFallback("Location", stringValue(row, "id")),
    assignedService: value(assignedLocation, "fulfillmentService") ?? null,
    holds: [],
    fulfillAt: nullableString(row, "scheduledAt"),
    fulfillBy: nullableString(row, "scheduledAt"),
    supportedActions:
      (value(snapshot, "supportedActions") as unknown[] | undefined)?.map(String) ??
      fulfillmentActions(stringValue(row, "status")),
    createdAt: stringValue(row, "createdAt"),
    updatedAt: stringValue(row, "updatedAt"),
  };
}

export function mapSimpleEntity(row: Row, type: GlobalIdEntity) {
  return { ...camelizeRecord(row), id: encodeId(stringValue(row, "id"), type) };
}

export function camelizeRecord(row: Row): Row {
  return Object.fromEntries(
    Object.entries(row).map(([key, current]) => [
      key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase()),
      current,
    ]),
  );
}

function mapPaymentMethod(row: Row | undefined) {
  if (!row) return null;
  return {
    code: stringValue(row, "code"),
    title: nullableString(row, "title") ?? stringValue(row, "code"),
    providerCode: stringValue(row, "provider"),
    flow: stringValue(row, "flow"),
    customerInput: rowValue(row, "customerInputSnapshot") ?? {},
    providerSnapshot: rowValue(row, "providerData") ?? {},
  };
}

function mapAttemptStatus(status: string): string {
  if (status === "SUCCEEDED") return "PAID";
  if (status === "AUTHORIZED") return "AUTHORIZED";
  if (status === "FAILED") return "FAILED";
  if (status === "EXPIRED") return "EXPIRED";
  return "PENDING";
}

function mapWeight(snapshot: Row) {
  const value = Number(snapshot.weightValue ?? snapshot.weight ?? 0);
  return value > 0 ? { value, unit: String(snapshot.weightUnit ?? "g") } : null;
}

function encodeOptionalTarget(id: string | null, type: string): string | null {
  return id ? composeFallback(type, id) : null;
}

function composeFallback(type: string, id: string): string {
  return Buffer.from(`gid://shopana/${type}/${id}`, "utf8").toString("base64");
}

function fulfillmentActions(status: string): string[] {
  if (status === "CANCELLED" || status === "CLOSED") return [];
  return ["HOLD", "MOVE", "SPLIT", "FULFILL"];
}
