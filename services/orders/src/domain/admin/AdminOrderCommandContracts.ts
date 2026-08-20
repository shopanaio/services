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
  orderCreate: { arrays: ["lines"] },
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
  orderEditLineAdd: { ids: ["editId"], positiveInts: ["expectedEditVersion"] },
  orderEditLineUpdate: { ids: ["editId"], positiveInts: ["expectedEditVersion"] },
  orderEditLineRemove: { ids: ["editId"], positiveInts: ["expectedEditVersion"] },
  orderEditShippingUpdate: { ids: ["editId"], positiveInts: ["expectedEditVersion"] },
  orderEditDiscountAdd: { ids: ["editId"], positiveInts: ["expectedEditVersion"] },
  orderEditDiscountRemove: { ids: ["editId"], positiveInts: ["expectedEditVersion"] },
  orderEditCommit: { ids: ["editId"], positiveInts: ["expectedEditVersion"] },
  orderEditAbandon: { ids: ["editId"], positiveInts: ["expectedEditVersion"] },
  orderManualPaymentRecord: orderByOrderId,
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
  orderRefundCreate: { ...orderByOrderId, strings: ["reasonCode"] },
  orderPaymentStatusOverride: orderByOrderId,
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
  shipmentMarkShipped: shipment,
  shipmentMarkDelivered: shipment,
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
  if (errors.length) throw new z.ZodError(errors);
  return input;
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
  "orderPaymentStatusOverride",
  "orderIntegrationLinkDetach",
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
