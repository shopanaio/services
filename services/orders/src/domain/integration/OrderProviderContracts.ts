import { z } from "zod";
import type {
  ApplyOrderIntegrationEventV1Params,
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
