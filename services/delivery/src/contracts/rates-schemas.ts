import { z } from "zod";
import type { DeliveryProviderExecutionPolicySnapshot } from "./rates.js";

export const DeliveryProviderExecutionPolicySnapshotSchema = z
  .object({
    revision: z.string().trim().min(1).max(512),
    timeoutMs: z.number().int().safe().min(50).max(30_000),
    maxAttempts: z.literal(1),
    maxConcurrentRequests: z.number().int().safe().min(1).max(100),
    retryableCategories: z.tuple([]),
    cache: z
      .object({
        mode: z.enum(["NONE", "IDEMPOTENT_REQUEST"]),
        maxAgeSeconds: z.number().int().safe().nonnegative().max(3_600),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.cache.mode === "NONE" && value.cache.maxAgeSeconds !== 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cache", "maxAgeSeconds"],
        message: "Disabled rate cache must have zero max age",
      });
    }
    if (value.cache.mode === "IDEMPOTENT_REQUEST" && value.cache.maxAgeSeconds === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cache", "maxAgeSeconds"],
        message: "Enabled rate cache requires a positive max age",
      });
    }
  });

export function parseDeliveryProviderExecutionPolicySnapshot(
  value: unknown,
): DeliveryProviderExecutionPolicySnapshot {
  return DeliveryProviderExecutionPolicySnapshotSchema.parse(
    value,
  ) as DeliveryProviderExecutionPolicySnapshot;
}
