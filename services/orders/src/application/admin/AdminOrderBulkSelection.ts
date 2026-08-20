export type AdminOrderBulkFilterField =
  | "id"
  | "number"
  | "status"
  | "paymentStatus"
  | "fulfillmentStatus"
  | "deliveryStatus"
  | "returnStatus"
  | "placementStatus"
  | "customerId"
  | "customerName"
  | "customerEmail"
  | "customerPhone"
  | "externalId"
  | "sourceCode"
  | "totalAmount"
  | "currencyCode"
  | "shippingCountry"
  | "deliveryMethodCode"
  | "paymentMethodCode"
  | "tag"
  | "trackingNumber"
  | "createdAt"
  | "updatedAt"
  | "placedAt";

export type AdminOrderBulkFilterOperator =
  | "eq"
  | "in"
  | "notIn"
  | "contains"
  | "startsWith"
  | "gt"
  | "gte"
  | "lt"
  | "lte";

export type AdminOrderBulkPredicate =
  | Readonly<{
      kind: "comparison";
      field: AdminOrderBulkFilterField;
      operator: AdminOrderBulkFilterOperator;
      value: string | readonly string[];
    }>
  | Readonly<{ kind: "boolean"; field: "hasTracking" | "archived"; value: boolean }>
  | Readonly<{ kind: "and" | "or"; predicates: readonly AdminOrderBulkPredicate[] }>;

export type AdminOrderBulkSelection = Readonly<{
  ids: readonly string[] | null;
  excludedIds: readonly string[];
  predicate: AdminOrderBulkPredicate | null;
}>;

export type AdminOrderBulkTarget = Readonly<{
  id: string;
  version: number;
  tags: readonly string[];
}>;

const fieldOperators: Readonly<
  Record<AdminOrderBulkFilterField, readonly AdminOrderBulkFilterOperator[]>
> = {
  id: ["eq", "in", "notIn"],
  number: ["eq", "gt", "gte", "lt", "lte"],
  status: ["eq", "in"],
  paymentStatus: ["eq", "in"],
  fulfillmentStatus: ["eq", "in"],
  deliveryStatus: ["eq", "in"],
  returnStatus: ["eq", "in"],
  placementStatus: ["eq", "in"],
  customerId: ["eq", "in", "notIn"],
  customerName: ["eq", "in", "contains", "startsWith"],
  customerEmail: ["eq", "in", "contains", "startsWith"],
  customerPhone: ["eq", "in", "contains", "startsWith"],
  externalId: ["eq", "in", "contains", "startsWith"],
  sourceCode: ["eq", "in", "contains", "startsWith"],
  totalAmount: ["eq", "gt", "gte", "lt", "lte"],
  currencyCode: ["eq", "in"],
  shippingCountry: ["eq", "in"],
  deliveryMethodCode: ["eq", "in", "contains", "startsWith"],
  paymentMethodCode: ["eq", "in", "contains", "startsWith"],
  tag: ["eq", "in", "contains", "startsWith"],
  trackingNumber: ["eq", "in", "contains", "startsWith"],
  createdAt: ["eq", "gt", "gte", "lt", "lte"],
  updatedAt: ["eq", "gt", "gte", "lt", "lte"],
  placedAt: ["eq", "gt", "gte", "lt", "lte"],
};

const uuidFields = new Set<AdminOrderBulkFilterField>(["id", "customerId"]);
const arrayOperators = new Set<AdminOrderBulkFilterOperator>(["in", "notIn"]);

export function parseAdminOrderBulkSelection(
  input: Readonly<Record<string, unknown>>,
): AdminOrderBulkSelection {
  const selection = asRecord(input.selection);
  const ids = optionalUuidArray(selection.ids);
  const excludedIds = optionalUuidArray(selection.excludedIds) ?? [];
  const predicate =
    selection.where === undefined || selection.where === null
      ? null
      : parseWhere(asRecord(selection.where));

  if ((!ids || ids.length === 0) && !predicate) {
    throw new Error("ORDER_BULK_SELECTION_REQUIRED");
  }
  return { ids, excludedIds, predicate };
}

function parseWhere(where: Readonly<Record<string, unknown>>): AdminOrderBulkPredicate {
  const predicates: AdminOrderBulkPredicate[] = [];
  for (const [field, rawValue] of Object.entries(where)) {
    if (rawValue === undefined || rawValue === null) continue;
    if (field === "and" || field === "or") {
      if (!Array.isArray(rawValue) || rawValue.length === 0) {
        throw new Error("ORDER_BULK_FILTER_EMPTY");
      }
      predicates.push({
        kind: field,
        predicates: rawValue.map((value) => parseWhere(asRecord(value))),
      });
      continue;
    }
    if (field === "hasTracking" || field === "archived") {
      if (typeof rawValue !== "boolean") throw new Error("ORDER_BULK_FILTER_INVALID");
      predicates.push({ kind: "boolean", field, value: rawValue });
      continue;
    }
    if (!Object.hasOwn(fieldOperators, field)) throw new Error("ORDER_BULK_FILTER_UNSUPPORTED");
    predicates.push(...parseComparison(field as AdminOrderBulkFilterField, rawValue));
  }
  if (predicates.length === 0) throw new Error("ORDER_BULK_FILTER_EMPTY");
  return predicates.length === 1 ? predicates[0]! : { kind: "and", predicates };
}

function parseComparison(
  field: AdminOrderBulkFilterField,
  rawValue: unknown,
): AdminOrderBulkPredicate[] {
  const filter = asRecord(rawValue);
  const allowed = new Set(fieldOperators[field]);
  const predicates: AdminOrderBulkPredicate[] = [];
  for (const [operator, rawOperatorValue] of Object.entries(filter)) {
    if (rawOperatorValue === undefined || rawOperatorValue === null) continue;
    if (!allowed.has(operator as AdminOrderBulkFilterOperator)) {
      throw new Error("ORDER_BULK_FILTER_OPERATOR_INVALID");
    }
    const typedOperator = operator as AdminOrderBulkFilterOperator;
    const value = arrayOperators.has(typedOperator)
      ? parseStringArray(rawOperatorValue, field)
      : parseScalar(rawOperatorValue, field);
    predicates.push({ kind: "comparison", field, operator: typedOperator, value });
  }
  if (predicates.length === 0) throw new Error("ORDER_BULK_FILTER_EMPTY");
  return predicates;
}

function parseStringArray(value: unknown, field: AdminOrderBulkFilterField): readonly string[] {
  if (!Array.isArray(value)) throw new Error("ORDER_BULK_FILTER_INVALID");
  if (value.length === 0) throw new Error("ORDER_BULK_FILTER_EMPTY");
  return value.map((item) => parseScalar(item, field));
}

function parseScalar(value: unknown, field: AdminOrderBulkFilterField): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("ORDER_BULK_FILTER_INVALID");
  }
  if (uuidFields.has(field) && !isUuid(value)) throw new Error("ORDER_BULK_ID_INVALID");
  if (field === "number" && !/^\d+$/.test(value)) {
    throw new Error("ORDER_BULK_FILTER_INVALID");
  }
  if (field === "totalAmount" && !/^\d+(?:\.\d+)?$/.test(value)) {
    throw new Error("ORDER_BULK_FILTER_INVALID");
  }
  if (
    (field === "createdAt" || field === "updatedAt" || field === "placedAt") &&
    !Number.isFinite(Date.parse(value))
  ) {
    throw new Error("ORDER_BULK_FILTER_INVALID");
  }
  if (field === "currencyCode" && !/^[A-Z]{3}$/.test(value)) {
    throw new Error("ORDER_BULK_FILTER_INVALID");
  }
  if (field === "shippingCountry" && !/^[A-Z]{2}$/.test(value)) {
    throw new Error("ORDER_BULK_FILTER_INVALID");
  }
  return value;
}

function optionalUuidArray(value: unknown): readonly string[] | null {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) throw new Error("ORDER_BULK_ID_INVALID");
  return value.map((id) => {
    if (typeof id !== "string" || !isUuid(id)) throw new Error("ORDER_BULK_ID_INVALID");
    return id;
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("ORDER_BULK_FILTER_INVALID");
  }
  return value as Record<string, unknown>;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
