import { z } from "zod";
import type {
  ApplyOrderIntegrationEventV1Params,
  ApplyOrderIntegrationImportV1Params,
  CompleteOrderFulfillmentServiceOperationV1Params,
} from "@shopana/broker-types";

const uuid = z.string().uuid();
const nonEmpty = z.string().trim().min(1);
const occurredAt = z.string().datetime({ offset: true });

export const completeOrderFulfillmentServiceOperationV1Schema: z.ZodType<CompleteOrderFulfillmentServiceOperationV1Params> =
  z
    .object({
      contractVersion: z.literal(1),
      operationId: uuid,
      providerEventId: nonEmpty,
      providerSequence: z.number().int().nonnegative().nullable(),
      status: z.enum(["ACCEPTED", "REJECTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
      externalId: nonEmpty,
      externalRevision: nonEmpty.nullable(),
      occurredAt,
      payload: z.record(z.unknown()),
    })
    .strict();

export const applyOrderIntegrationEventV1Schema: z.ZodType<ApplyOrderIntegrationEventV1Params> = z
  .object({
    contractVersion: z.literal(1),
    integrationLinkId: uuid,
    providerEventId: nonEmpty,
    externalOrderId: nonEmpty,
    externalRevision: nonEmpty,
    eventType: z.enum(["SYNC_ACKNOWLEDGED", "EXTERNAL_CHANGED", "EXTERNAL_DELETED"]),
    occurredAt,
    payload: z.record(z.unknown()),
  })
  .strict();

export type TrustedOrderAppContext = Readonly<{
  organizationId: string;
  storeId: string;
  installationId: string;
  appCode: string;
  appVersion: string;
  operationId: string | null;
  correlationId: string;
}>;

export type FulfillmentServiceCallbackWorkflowInput = Readonly<{
  context: TrustedOrderAppContext;
  input: CompleteOrderFulfillmentServiceOperationV1Params;
}>;

export type IntegrationEventWorkflowInput = Readonly<{
  context: TrustedOrderAppContext;
  input: ApplyOrderIntegrationEventV1Params;
}>;

export const applyOrderIntegrationImportV1Schema: z.ZodType<ApplyOrderIntegrationImportV1Params> = z
  .object({
    contractVersion: z.literal(1),
    integrationLinkId: uuid,
    providerEventId: nonEmpty,
    import: z
      .object({
        schemaVersion: z.literal(1),
        status: z.enum(["OPEN", "CLOSED"]).nullable(),
        paymentStatus: z
          .enum([
            "NOT_REQUIRED",
            "PENDING",
            "AUTHORIZED",
            "PARTIALLY_PAID",
            "PAID",
            "PARTIALLY_REFUNDED",
            "REFUNDED",
            "VOIDED",
            "EXPIRED",
            "FAILED",
          ])
          .nullable(),
        fulfillmentStatus: z
          .enum([
            "UNFULFILLED",
            "SCHEDULED",
            "ON_HOLD",
            "PARTIALLY_FULFILLED",
            "FULFILLED",
            "CANCELLED",
          ])
          .nullable(),
        deliveryStatus: z
          .enum([
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
          ])
          .nullable(),
        lineQuantities: z
          .array(z.object({ orderLineId: uuid, quantity: z.number().int().positive() }))
          .nullable(),
        tags: z.array(nonEmpty).nullable(),
        externalOrderId: nonEmpty,
        externalRevision: nonEmpty,
        observedAt: occurredAt,
      })
      .strict(),
    idempotencyKey: nonEmpty,
    correlationId: uuid,
  })
  .strict();

export type IntegrationImportWorkflowInput = Readonly<{
  context: TrustedOrderAppContext;
  input: ApplyOrderIntegrationImportV1Params;
}>;
