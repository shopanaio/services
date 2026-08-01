import { z } from "zod";
import type { DeliveryProviderAssetPolicySnapshot } from "./ports.js";

export const DeliveryProviderAssetPolicySnapshotSchema = z
  .object({
    revision: z.string().trim().min(1).max(512),
    allowedHosts: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(253)
          .regex(
            /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/,
          ),
      )
      .min(1)
      .max(100),
    allowedContentTypes: z
      .array(z.enum(["application/pdf", "image/png", "application/zpl"]))
      .min(1)
      .max(3),
    allowedPorts: z
      .array(z.number().int().safe().min(1).max(65_535))
      .min(1)
      .max(16),
    maxRedirects: z.literal(0),
    networkPolicy: z.literal("PUBLIC_IPS_ONLY_DNS_PINNED"),
    maxBytes: z.number().int().safe().min(1_024).max(50 * 1_024 * 1_024),
    fetchTimeoutMs: z.number().int().safe().min(50).max(30_000),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.allowedHosts).size !== value.allowedHosts.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allowedHosts"],
        message: "Allowed provider asset hosts must be unique",
      });
    }
    if (
      new Set(value.allowedContentTypes).size !==
      value.allowedContentTypes.length
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allowedContentTypes"],
        message: "Allowed provider asset content types must be unique",
      });
    }
    if (new Set(value.allowedPorts).size !== value.allowedPorts.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allowedPorts"],
        message: "Allowed provider asset ports must be unique",
      });
    }
  });

export function parseDeliveryProviderAssetPolicySnapshot(
  value: unknown,
): DeliveryProviderAssetPolicySnapshot {
  return DeliveryProviderAssetPolicySnapshotSchema.parse(
    value,
  ) as DeliveryProviderAssetPolicySnapshot;
}
