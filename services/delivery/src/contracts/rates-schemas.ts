import { z } from "zod";
import type { DeliveryProviderExecutionPolicySnapshot } from "./rates.js";

export const DeliveryProviderExecutionPolicySnapshotSchema = z
  .object({
    revision: z.string().trim().min(1).max(512),
    timeoutMs: z.number().int().safe().min(50).max(30_000),
    maxAttempts: z.number().int().safe().min(1).max(5),
    maxConcurrentRequests: z.number().int().safe().min(1).max(100),
    retryableCategories: z
      .array(
        z.enum([
          "PROVIDER_UNAVAILABLE",
          "TIMEOUT",
          "RATE_LIMITED",
          "UNKNOWN",
        ]),
      )
      .max(4),
    cache: z
      .object({
        mode: z.enum(["NONE", "IDEMPOTENT_REQUEST"]),
        maxAgeSeconds: z.number().int().safe().nonnegative().max(3_600),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      new Set(value.retryableCategories).size !==
      value.retryableCategories.length
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["retryableCategories"],
        message: "Retryable failure categories must be unique",
      });
    }
    if (value.cache.mode === "NONE" && value.cache.maxAgeSeconds !== 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cache", "maxAgeSeconds"],
        message: "Disabled rate cache must have zero max age",
      });
    }
    if (
      value.cache.mode === "IDEMPOTENT_REQUEST" &&
      value.cache.maxAgeSeconds === 0
    ) {
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
