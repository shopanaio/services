import { z } from "zod";

export const adminOrderCommandNames = [
  "orderCreate",
  "orderUpdate",
  "orderDelete",
  "orderCompleteDraft",
  "orderCancel",
  "orderClose",
  "orderReopen",
  "orderArchive",
  "orderUnarchive",
  "orderCustomerSet",
  "orderTagsUpdate",
  "orderAdminNoteUpdate",
  "orderCommentAdd",
  "orderCustomFieldsUpdate",
  "orderLineAdd",
  "orderLineUpdate",
  "orderLineDelete",
  "orderEditBegin",
  "orderEditLineAdd",
  "orderEditLineUpdate",
  "orderEditLineRemove",
  "orderEditShippingUpdate",
  "orderEditDiscountAdd",
  "orderEditDiscountRemove",
  "orderEditCommit",
  "orderEditAbandon",
  "orderManualPaymentRecord",
  "orderPaymentCapture",
  "orderPaymentVoid",
  "orderPaymentRetry",
  "orderRefundCreate",
  "orderPaymentStatusOverride",
  "fulfillmentOrderSplit",
  "fulfillmentOrderMove",
  "fulfillmentOrderHold",
  "fulfillmentOrderReleaseHold",
  "fulfillmentOrderSubmit",
  "fulfillmentOrderCancelRequest",
  "fulfillmentCreate",
  "fulfillmentCancel",
  "shipmentCreate",
  "shipmentTrackingUpdate",
  "shipmentMarkShipped",
  "shipmentMarkDelivered",
  "shipmentCancel",
  "shipmentReconcile",
  "orderReturnCreate",
  "orderReturnApprove",
  "orderReturnReject",
  "orderReturnCancel",
  "orderReturnReceive",
  "orderExchangeCreate",
  "orderExchangeCancel",
  "orderIntegrationSyncRequest",
  "orderIntegrationSyncRetry",
  "orderIntegrationLinkDetach",
  "ordersBulkAction",
] as const;

export type AdminOrderCommandName = (typeof adminOrderCommandNames)[number];

export type AdminOrderActor = Readonly<{
  type: "STAFF" | "API_KEY" | "APP" | "SYSTEM";
  id: string | null;
}>;

export type AdminOrderCommandContext = Readonly<{
  organizationId: string;
  storeId: string;
  actor: AdminOrderActor;
  correlationId: string;
}>;

export type AdminOrderCommandInput = Readonly<{
  context: AdminOrderCommandContext;
  input: Readonly<Record<string, unknown>>;
}>;

export type AdminOrderCommandResult = Readonly<{
  command: AdminOrderCommandName;
  orderId: string | null;
  orderVersion: number | null;
  resourceId: string | null;
  operationId: string | null;
  duplicate: boolean;
  deleted: boolean;
  bulkResults?: readonly Readonly<{
    orderId: string;
    success: boolean;
    orderVersion: number | null;
    errorCode: string | null;
  }>[];
}>;

const uuid = z.string().uuid();

export const adminOrderPublicInputSchema = z.record(z.unknown()).superRefine((value, context) => {
  if ("organizationId" in value || "storeId" in value || "context" in value) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Tenant context is not accepted in Admin command input",
    });
  }
  if (typeof value.idempotencyKey !== "string" || value.idempotencyKey.trim().length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["idempotencyKey"],
      message: "idempotencyKey is required",
    });
  }
});

type CommandRequirement = Readonly<{
  ids?: readonly string[];
  positiveInts?: readonly string[];
  arrays?: readonly string[];
  objects?: readonly string[];
  strings?: readonly string[];
}>;

const orderById = { ids: ["id"], positiveInts: ["expectedVersion"] } as const;
const orderByOrderId = { ids: ["orderId"], positiveInts: ["expectedVersion"] } as const;
const fulfillmentOrder = {
  ids: ["fulfillmentOrderId"],
  positiveInts: ["expectedVersion"],
} as const;
const shipment = { ids: ["shipmentId"], positiveInts: ["expectedVersion"] } as const;
const returned = { ids: ["returnId"], positiveInts: ["expectedVersion"] } as const;

const commandRequirements: Partial<Record<AdminOrderCommandName, CommandRequirement>> = {
  orderCreate: { arrays: ["lines"], objects: ["contact"] },
  orderUpdate: orderById,
  orderDelete: orderById,
  orderCompleteDraft: orderById,
  orderCancel: { ...orderById, strings: ["reasonCode"] },
  orderClose: orderById,
  orderReopen: orderById,
  orderArchive: orderById,
  orderUnarchive: orderById,
  orderCustomerSet: orderById,
  orderTagsUpdate: { ...orderById, arrays: ["tags"] },
  orderAdminNoteUpdate: orderById,
  orderCommentAdd: { ...orderById, strings: ["comment"] },
  orderCustomFieldsUpdate: orderById,
  orderLineAdd: { ...orderByOrderId, objects: ["line"] },
  orderLineUpdate: { ids: ["orderId", "lineId"], positiveInts: ["expectedVersion"] },
  orderLineDelete: { ids: ["orderId", "lineId"], positiveInts: ["expectedVersion"] },
  orderEditBegin: orderByOrderId,
  orderEditLineAdd: {
    ids: ["editId"],
    positiveInts: ["expectedEditVersion"],
    objects: ["line"],
  },
  orderEditLineUpdate: {
    ids: ["editId", "lineId"],
    positiveInts: ["expectedEditVersion"],
  },
  orderEditLineRemove: {
    ids: ["editId", "lineId"],
    positiveInts: ["expectedEditVersion"],
  },
  orderEditShippingUpdate: {
    ids: ["editId"],
    positiveInts: ["expectedEditVersion"],
    objects: ["shipping"],
  },
  orderEditDiscountAdd: {
    ids: ["editId"],
    positiveInts: ["expectedEditVersion"],
    objects: ["amount"],
    strings: ["title", "reasonCode"],
  },
  orderEditDiscountRemove: {
    ids: ["editId", "discountId"],
    positiveInts: ["expectedEditVersion"],
  },
  orderEditCommit: { ids: ["editId"], positiveInts: ["expectedEditVersion"] },
  orderEditAbandon: { ids: ["editId"], positiveInts: ["expectedEditVersion"] },
  orderManualPaymentRecord: {
    ...orderByOrderId,
    objects: ["amount"],
    strings: ["methodCode", "paidAt"],
  },
  orderPaymentCapture: {
    ids: ["orderId", "transactionId"],
    positiveInts: ["expectedVersion"],
  },
  orderPaymentVoid: {
    ids: ["orderId", "transactionId"],
    positiveInts: ["expectedVersion"],
    strings: ["reason"],
  },
  orderPaymentRetry: orderByOrderId,
  orderRefundCreate: {
    ...orderByOrderId,
    objects: ["amount"],
    strings: ["reasonCode"],
  },
  orderPaymentStatusOverride: {
    ...orderByOrderId,
    strings: ["status", "reasonCode", "note"],
  },
  fulfillmentOrderSplit: { ...fulfillmentOrder, arrays: ["lines"] },
  fulfillmentOrderMove: { ...fulfillmentOrder, ids: ["fulfillmentOrderId", "locationId"] },
  fulfillmentOrderHold: { ...fulfillmentOrder, strings: ["reasonCode"] },
  fulfillmentOrderReleaseHold: {
    ...fulfillmentOrder,
    ids: ["fulfillmentOrderId", "holdId"],
  },
  fulfillmentOrderSubmit: fulfillmentOrder,
  fulfillmentOrderCancelRequest: { ...fulfillmentOrder, strings: ["reasonCode"] },
  fulfillmentCreate: { ...fulfillmentOrder, arrays: ["lines"] },
  fulfillmentCancel: {
    ids: ["fulfillmentId"],
    positiveInts: ["expectedVersion"],
    strings: ["reasonCode"],
  },
  shipmentCreate: {
    ids: ["fulfillmentId"],
    positiveInts: ["expectedVersion"],
    arrays: ["packages"],
  },
  shipmentTrackingUpdate: { ...shipment, arrays: ["tracking"] },
  shipmentMarkShipped: { ...shipment, strings: ["shippedAt"] },
  shipmentMarkDelivered: { ...shipment, strings: ["deliveredAt"] },
  shipmentCancel: { ...shipment, strings: ["reasonCode"] },
  shipmentReconcile: shipment,
  orderReturnCreate: { ...orderByOrderId, arrays: ["lines"] },
  orderReturnApprove: { ...returned, ids: ["returnId", "locationId"] },
  orderReturnReject: { ...returned, strings: ["reasonCode"] },
  orderReturnCancel: { ...returned, strings: ["reasonCode"] },
  orderReturnReceive: { ...returned, ids: ["returnId", "locationId"], arrays: ["lines"] },
  orderExchangeCreate: { ...orderByOrderId, arrays: ["inboundLines", "outboundLines"] },
  orderExchangeCancel: {
    ids: ["exchangeId"],
    positiveInts: ["expectedVersion"],
    strings: ["reasonCode"],
  },
  orderIntegrationSyncRequest: { ...orderByOrderId, ids: ["orderId", "integrationLinkId"] },
  orderIntegrationSyncRetry: { ...orderByOrderId, ids: ["orderId", "operationId"] },
  orderIntegrationLinkDetach: {
    ...orderByOrderId,
    ids: ["orderId", "integrationLinkId"],
    strings: ["reason"],
  },
};

export function parseAdminOrderPublicInput(
  command: AdminOrderCommandName,
  raw: unknown,
): Readonly<Record<string, unknown>> {
  const input = adminOrderPublicInputSchema.parse(raw);
  const requirement = commandRequirements[command];
  if (!requirement) return input;
  const errors: z.ZodIssue[] = [];
  for (const field of requirement.ids ?? []) {
    if (typeof input[field] !== "string" || !uuid.safeParse(input[field]).success) {
      errors.push(customIssue(field, `${field} must be a UUID`));
    }
  }
  for (const field of requirement.positiveInts ?? []) {
    if (!Number.isSafeInteger(input[field]) || Number(input[field]) <= 0) {
      errors.push(customIssue(field, `${field} must be a positive integer`));
    }
  }
  for (const field of requirement.arrays ?? []) {
    if (!Array.isArray(input[field])) {
      errors.push(customIssue(field, `${field} must be an array`));
    }
  }
  for (const field of requirement.objects ?? []) {
    if (!input[field] || typeof input[field] !== "object" || Array.isArray(input[field])) {
      errors.push(customIssue(field, `${field} must be an object`));
    }
  }
  for (const field of requirement.strings ?? []) {
    if (typeof input[field] !== "string" || input[field].trim().length === 0) {
      errors.push(customIssue(field, `${field} must be a non-empty string`));
    }
  }
  validateCommandShape(command, input, errors);
  if (errors.length) throw new z.ZodError(errors);
  return input;
}

function validateCommandShape(
  command: AdminOrderCommandName,
  input: Readonly<Record<string, unknown>>,
  errors: z.ZodIssue[],
): void {
  const requireNonEmptyArray = (field: string) => {
    if (Array.isArray(input[field]) && input[field].length === 0) {
      errors.push(customIssue(field, `${field} must contain at least one item`));
    }
  };
  const validateMoney = (value: unknown, path: string) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      errors.push(customIssue(path, `${path} must be money`));
      return;
    }
    const money = value as Record<string, unknown>;
    if (typeof money.amount !== "string" || !/^\d+(?:\.\d+)?$/.test(money.amount)) {
      errors.push(customIssue(`${path}.amount`, `${path}.amount must be a non-negative decimal`));
    }
    if (typeof money.currencyCode !== "string" || !/^[A-Z]{3}$/.test(money.currencyCode)) {
      errors.push(customIssue(`${path}.currencyCode`, `${path}.currencyCode must be ISO 4217`));
    }
  };
  const validateQuantityLines = (field: string, idField: string) => {
    ((input[field] as unknown[] | undefined) ?? []).forEach((rawLine, index) => {
      if (!rawLine || typeof rawLine !== "object" || Array.isArray(rawLine)) {
        errors.push(customIssue(`${field}.${index}`, `${field} item must be an object`));
        return;
      }
      const line = rawLine as Record<string, unknown>;
      if (typeof line[idField] !== "string" || !uuid.safeParse(line[idField]).success) {
        errors.push(customIssue(`${field}.${index}.${idField}`, `${idField} must be a UUID`));
      }
      if (!Number.isSafeInteger(line.quantity) || Number(line.quantity) <= 0) {
        errors.push(customIssue(`${field}.${index}.quantity`, "quantity must be positive"));
      }
    });
  };
  const validateCreatedLine = (rawLine: unknown, path: string) => {
    if (!rawLine || typeof rawLine !== "object" || Array.isArray(rawLine)) {
      errors.push(customIssue(path, `${path} must be an object`));
      return;
    }
    const line = rawLine as Record<string, unknown>;
    if (typeof line.title !== "string" || !line.title.trim()) {
      errors.push(customIssue(`${path}.title`, "Line title is required"));
    }
    if (!Number.isSafeInteger(line.quantity) || Number(line.quantity) <= 0) {
      errors.push(customIssue(`${path}.quantity`, "Line quantity must be positive"));
    }
    validateMoney(line.unitPrice, `${path}.unitPrice`);
    if (line.unitCompareAtPrice !== undefined) {
      validateMoney(line.unitCompareAtPrice, `${path}.unitCompareAtPrice`);
    }
    if (line.unitCost !== undefined) validateMoney(line.unitCost, `${path}.unitCost`);
  };
  if (command === "orderCreate") {
    requireNonEmptyArray("lines");
    ((input.lines as unknown[] | undefined) ?? []).forEach((rawLine, index) => {
      validateCreatedLine(rawLine, `lines.${index}`);
    });
  }
  if (command === "orderEditLineAdd") {
    validateCreatedLine(input.line, "line");
  }
  if (command === "orderLineAdd") validateCreatedLine(input.line, "line");
  if (command === "orderLineUpdate") {
    if (
      input.quantity !== undefined &&
      (!Number.isSafeInteger(input.quantity) || Number(input.quantity) <= 0)
    ) {
      errors.push(customIssue("quantity", "quantity must be positive"));
    }
    if (input.unitCost !== undefined) validateMoney(input.unitCost, "unitCost");
  }
  if (command === "orderEditLineUpdate") {
    if (input.unitPrice !== undefined) validateMoney(input.unitPrice, "unitPrice");
    if (
      input.quantity !== undefined &&
      (!Number.isSafeInteger(input.quantity) || Number(input.quantity) <= 0)
    ) {
      errors.push(customIssue("quantity", "quantity must be positive"));
    }
    if (input.quantity === undefined && input.unitPrice === undefined) {
      errors.push(customIssue("quantity", "At least one line change is required"));
    }
  }
  if (command === "orderEditDiscountAdd") validateMoney(input.amount, "amount");
  if (command === "orderManualPaymentRecord" || command === "orderRefundCreate") {
    validateMoney(input.amount, "amount");
  }
  if (command === "orderPaymentCapture" && input.amount !== undefined) {
    validateMoney(input.amount, "amount");
  }
  if (command === "fulfillmentCreate" || command === "fulfillmentOrderSplit") {
    requireNonEmptyArray("lines");
    validateQuantityLines("lines", "fulfillmentOrderLineId");
  }
  if (command === "shipmentCreate") {
    requireNonEmptyArray("packages");
    ((input.packages as unknown[] | undefined) ?? []).forEach((rawPackage, packageIndex) => {
      if (!rawPackage || typeof rawPackage !== "object" || Array.isArray(rawPackage)) {
        errors.push(customIssue(`packages.${packageIndex}`, "Shipment package must be an object"));
        return;
      }
      const items = (rawPackage as Record<string, unknown>).items;
      if (!Array.isArray(items) || items.length === 0) {
        errors.push(
          customIssue(`packages.${packageIndex}.items`, "Shipment package requires items"),
        );
      } else {
        items.forEach((rawItem, itemIndex) => {
          if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) {
            errors.push(
              customIssue(
                `packages.${packageIndex}.items.${itemIndex}`,
                "Package item must be an object",
              ),
            );
            return;
          }
          const item = rawItem as Record<string, unknown>;
          if (typeof item.orderLineId !== "string" || !uuid.safeParse(item.orderLineId).success) {
            errors.push(
              customIssue(
                `packages.${packageIndex}.items.${itemIndex}.orderLineId`,
                "orderLineId must be a UUID",
              ),
            );
          }
          if (!Number.isSafeInteger(item.quantity) || Number(item.quantity) <= 0) {
            errors.push(
              customIssue(
                `packages.${packageIndex}.items.${itemIndex}.quantity`,
                "quantity must be positive",
              ),
            );
          }
        });
      }
      const shipmentPackage = rawPackage as Record<string, unknown>;
      if (shipmentPackage.declaredValue !== undefined) {
        validateMoney(shipmentPackage.declaredValue, `packages.${packageIndex}.declaredValue`);
      }
    });
  }
  if (["orderReturnCreate", "orderReturnReceive", "orderExchangeCreate"].includes(command)) {
    for (const field of command === "orderExchangeCreate"
      ? ["inboundLines", "outboundLines"]
      : ["lines"]) {
      requireNonEmptyArray(field);
    }
  }
  if (command === "orderReturnReceive") {
    ((input.lines as unknown[] | undefined) ?? []).forEach((rawLine, index) => {
      if (!rawLine || typeof rawLine !== "object" || Array.isArray(rawLine)) return;
      const line = rawLine as Record<string, unknown>;
      if (typeof line.orderLineId !== "string" || !uuid.safeParse(line.orderLineId).success) {
        errors.push(customIssue(`lines.${index}.orderLineId`, "orderLineId must be a UUID"));
      }
      const received = Number(line.receivedQuantity);
      const restockable = Number(line.restockableQuantity);
      const damaged = Number(line.damagedQuantity);
      if (
        !Number.isSafeInteger(received) ||
        received <= 0 ||
        !Number.isSafeInteger(restockable) ||
        restockable < 0 ||
        !Number.isSafeInteger(damaged) ||
        damaged < 0 ||
        restockable + damaged !== received
      ) {
        errors.push(
          customIssue(`lines.${index}`, "Return disposition quantities are inconsistent"),
        );
      }
    });
  }
  if (command === "orderReturnCreate" || command === "orderExchangeCreate") {
    const fields = command === "orderExchangeCreate" ? ["inboundLines"] : ["lines"];
    for (const field of fields) {
      validateQuantityLines(field, "orderLineId");
      ((input[field] as unknown[] | undefined) ?? []).forEach((rawLine, index) => {
        if (!rawLine || typeof rawLine !== "object" || Array.isArray(rawLine)) return;
        const reason = (rawLine as Record<string, unknown>).reasonCode;
        if (typeof reason !== "string" || !reason.trim()) {
          errors.push(customIssue(`${field}.${index}.reasonCode`, "reasonCode is required"));
        }
      });
    }
  }
  if (command === "orderExchangeCreate") {
    ((input.outboundLines as unknown[] | undefined) ?? []).forEach((line, index) =>
      validateCreatedLine(line, `outboundLines.${index}`),
    );
  }
}

function customIssue(field: string, message: string): z.ZodIssue {
  return { code: z.ZodIssueCode.custom, path: [field], message };
}

export const adminOrderCommandInputSchema: z.ZodType<AdminOrderCommandInput> = z.object({
  context: z.object({
    organizationId: uuid,
    storeId: uuid,
    actor: z.object({
      type: z.enum(["STAFF", "API_KEY", "APP", "SYSTEM"]),
      id: uuid.nullable(),
    }),
    correlationId: uuid,
  }),
  input: adminOrderPublicInputSchema,
});

export const sensitiveAdminOrderCommands = new Set<AdminOrderCommandName>([
  "orderDelete",
  "orderCancel",
  "orderManualPaymentRecord",
  "orderPaymentCapture",
  "orderPaymentVoid",
  "orderPaymentRetry",
  "orderRefundCreate",
  "orderPaymentStatusOverride",
  "fulfillmentOrderSubmit",
  "fulfillmentOrderCancelRequest",
  "fulfillmentCancel",
  "shipmentCancel",
  "shipmentReconcile",
  "orderReturnReceive",
  "orderIntegrationSyncRequest",
  "orderIntegrationSyncRetry",
  "orderIntegrationLinkDetach",
  "ordersBulkAction",
]);

export const asynchronousAdminOrderCommands = new Set<AdminOrderCommandName>([
  "orderCancel",
  "orderEditCommit",
  "orderPaymentCapture",
  "orderPaymentVoid",
  "orderPaymentRetry",
  "orderRefundCreate",
  "fulfillmentOrderSubmit",
  "fulfillmentOrderCancelRequest",
  "fulfillmentCancel",
  "shipmentCreate",
  "shipmentCancel",
  "shipmentReconcile",
  "orderReturnReceive",
  "orderIntegrationSyncRequest",
  "orderIntegrationSyncRetry",
  "ordersBulkAction",
]);
