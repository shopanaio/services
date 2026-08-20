import {
  GLOBAL_ID_NAMESPACE,
  GlobalIdEntity,
  composeGlobalId,
  decodeGlobalIdByType,
  parseGlobalId,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { Money } from "@shopana/shared-money";

export type Row = Record<string, unknown>;

export function value(row: Row, camel: string, snake = toSnake(camel)): unknown {
  return row[camel] ?? row[snake];
}

export function stringValue(row: Row, camel: string, fallback = ""): string {
  const current = value(row, camel);
  return current == null ? fallback : String(current);
}

export function nullableString(row: Row, camel: string): string | null {
  const current = value(row, camel);
  return current == null ? null : String(current);
}

export function numberValue(row: Row, camel: string, fallback = 0): number {
  const current = value(row, camel);
  const result = Number(current);
  return Number.isFinite(result) ? result : fallback;
}

export function rowsValue(row: Row, camel: string): Row[] {
  const current = value(row, camel);
  return Array.isArray(current) ? current.filter(isRow) : [];
}

export function rowValue(row: Row, camel: string): Row | null {
  const current = value(row, camel);
  return isRow(current) ? current : null;
}

export function money(amountMinor: unknown, currencyCode: string) {
  const minor = BigInt(String(amountMinor ?? 0));
  return {
    amount: Money.fromMinor(minor, currencyCode).toRoundedUnit(),
    currencyCode,
  };
}

export function encodeId(id: unknown, type: GlobalIdType): string | null {
  return typeof id === "string" && id ? composeGlobalId(GLOBAL_ID_NAMESPACE, type, id) : null;
}

const fieldTypes: Readonly<Record<string, GlobalIdType>> = {
  id: GlobalIdEntity.Order,
  orderId: GlobalIdEntity.Order,
  lineId: GlobalIdEntity.OrderLine,
  orderLineId: GlobalIdEntity.OrderLine,
  editId: GlobalIdEntity.OrderEditSession,
  discountId: GlobalIdEntity.OrderDiscount,
  transactionId: GlobalIdEntity.OrderPaymentTransaction,
  parentTransactionId: GlobalIdEntity.OrderPaymentTransaction,
  fulfillmentOrderId: GlobalIdEntity.FulfillmentOrder,
  fulfillmentOrderLineId: GlobalIdEntity.FulfillmentOrderLine,
  fulfillmentId: GlobalIdEntity.Fulfillment,
  holdId: GlobalIdEntity.FulfillmentHold,
  shipmentId: GlobalIdEntity.Shipment,
  returnId: GlobalIdEntity.OrderReturn,
  exchangeId: GlobalIdEntity.OrderExchange,
  integrationLinkId: GlobalIdEntity.OrderIntegrationLink,
  installationId: GlobalIdEntity.AppInstallation,
  operationId: GlobalIdEntity.OrderOperation,
  customerId: GlobalIdEntity.Customer,
  productId: GlobalIdEntity.Product,
  variantId: GlobalIdEntity.Variant,
  purchasableId: GlobalIdEntity.Variant,
};

const resourceIdFields = new Set(["assignedLocationId", "locationId", "shippingMethodId"]);

export function decodeCommandInput(command: string, raw: unknown): Record<string, unknown> {
  if (!isRow(raw)) throw new Error("Order command input must be an object");
  const input = decodeRecord(raw);
  if (command !== "orderCreate" && "id" in input) {
    const type = command.startsWith("orderEdit")
      ? GlobalIdEntity.OrderEditSession
      : GlobalIdEntity.Order;
    input.id = decodeGlobalIdByType(String(raw.id), type);
  }
  const selection = input.selection;
  if (isRow(selection)) {
    for (const field of ["ids", "excludedIds"] as const) {
      const ids = selection[field];
      if (Array.isArray(ids)) {
        selection[field] = ids.map((id) => decodeGlobalIdByType(String(id), GlobalIdEntity.Order));
      }
    }
  }
  return input;
}

function decodeRecord(raw: Row): Row {
  const result: Row = {};
  for (const [field, current] of Object.entries(raw)) {
    if (current == null) {
      result[field] = current;
    } else if (Array.isArray(current)) {
      result[field] = current.map((item) => (isRow(item) ? decodeRecord(item) : item));
    } else if (isRow(current)) {
      result[field] = decodeRecord(current);
    } else if (typeof current === "string" && fieldTypes[field]) {
      result[field] = decodeGlobalIdByType(current, fieldTypes[field]);
    } else if (typeof current === "string" && resourceIdFields.has(field)) {
      result[field] = parseGlobalId(current).id;
    } else {
      result[field] = current;
    }
  }
  return result;
}

function isRow(value: unknown): value is Row {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toSnake(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
