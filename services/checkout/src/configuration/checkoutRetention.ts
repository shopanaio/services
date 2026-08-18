import { getServiceConfig } from "@shopana/shared-service-config";
import { z } from "zod";

const schema = z.object({
  active_ttl_days: z.number().int().positive().max(365).default(30),
  snapshot_retention_days: z.number().int().positive().max(3_650).default(90),
  cleanup_batch_size: z.number().int().positive().max(10_000).default(500),
}).strict().refine(
  (value) => value.snapshot_retention_days >= value.active_ttl_days,
  "Checkout snapshot retention must not be shorter than the active TTL",
);

export function checkoutRetentionPolicy() {
  const { service } = getServiceConfig("checkout");
  return schema.parse(service.retention ?? {});
}

