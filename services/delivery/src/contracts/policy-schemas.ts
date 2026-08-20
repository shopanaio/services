import { z } from "zod";
import type {
  DeliveryCustomerInputSchemaPolicySnapshot,
  DeliveryProviderPublicDataPolicySnapshot,
} from "./ports.js";

const revisionSchema = z.string().trim().min(1).max(512);

export const DeliveryCustomerInputSchemaPolicySnapshotSchema = z
  .object({
    revision: revisionSchema,
    maxSchemaBytes: z.number().int().safe().min(1_024).max(1_048_576),
    maxInputBytes: z.number().int().safe().min(1_024).max(1_048_576),
    maxReferenceDepth: z.number().int().safe().min(0).max(32),
    maxEvaluationSteps: z.number().int().safe().min(1).max(1_000_000),
    allowRegexKeywords: z.literal(false),
  })
  .strict();

export const DeliveryProviderPublicDataPolicySnapshotSchema = z
  .object({
    revision: revisionSchema,
    allowedTopLevelKeys: z.array(z.string().trim().min(1).max(128)).max(250),
    maxBytes: z.number().int().safe().min(2).max(65_536),
  })
  .strict()
  .refine((value) => new Set(value.allowedTopLevelKeys).size === value.allowedTopLevelKeys.length, {
    path: ["allowedTopLevelKeys"],
    message: "Allowed public-data keys must be unique",
  });

export function parseDeliveryCustomerInputSchemaPolicySnapshot(
  value: unknown,
): DeliveryCustomerInputSchemaPolicySnapshot {
  return DeliveryCustomerInputSchemaPolicySnapshotSchema.parse(
    value,
  ) as DeliveryCustomerInputSchemaPolicySnapshot;
}

export function parseDeliveryProviderPublicDataPolicySnapshot(
  value: unknown,
): DeliveryProviderPublicDataPolicySnapshot {
  return DeliveryProviderPublicDataPolicySnapshotSchema.parse(
    value,
  ) as DeliveryProviderPublicDataPolicySnapshot;
}
