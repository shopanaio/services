import { z } from "zod";

const storeId = z.string().uuid();
const externalType = z.string().trim().min(1).max(64).optional();
const externalId = z.string().trim().min(1).max(255);
const metadata = z.record(z.unknown()).optional();
const idempotencyKey = z.string().trim().min(1).max(255);
const conflictPolicy = z.enum(["REJECT", "REASSIGN"]).optional();

export const lookupCustomerExternalReferenceParamsSchema = z
  .object({
    storeId,
    externalType,
    externalId,
  })
  .strict();

export const upsertCustomerExternalReferenceParamsSchema = z
  .object({
    storeId,
    customerId: z.string().uuid(),
    externalType,
    externalId,
    metadata,
    conflictPolicy,
    idempotencyKey,
  })
  .strict();

export const deleteCustomerExternalReferenceParamsSchema = z
  .object({
    storeId,
    externalType,
    externalId,
    idempotencyKey,
  })
  .strict();

const syncOperationSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("UPSERT"),
      customerId: z.string().uuid(),
      externalType,
      externalId,
      metadata,
      conflictPolicy,
    })
    .strict(),
  z
    .object({
      type: z.literal("DELETE"),
      externalType,
      externalId,
    })
    .strict(),
]);

export const syncCustomerExternalReferencesParamsSchema = z
  .object({
    storeId,
    syncId: idempotencyKey,
    operations: z.array(syncOperationSchema).min(1).max(1_000),
  })
  .strict();
