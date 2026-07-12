import type { Cache } from "cache-manager";
import type { Logger } from "../../kernel/types.js";

export async function invalidateSearchCacheAfterCommit(input: {
  cache: Cache;
  logger: Logger;
  storeId: string;
  resourceType: "synonym_group" | "product_boost";
  resourceId: string;
  keys: readonly string[];
}): Promise<void> {
  try {
    await invalidateAndLog(input);
  } catch {
    // This helper runs after commit and therefore has a strict no-throw contract.
  }
}

async function invalidateAndLog(input: {
  cache: Cache;
  logger: Logger;
  storeId: string;
  resourceType: "synonym_group" | "product_boost";
  resourceId: string;
  keys: readonly string[];
}): Promise<void> {
  const keys = [...new Set(input.keys)];
  const results = await Promise.allSettled(
    keys.map(async (key) => {
      await input.cache.del(key);
    }),
  );
  const failures = results.flatMap((result, index) =>
    result.status === "rejected"
      ? [{ key: keys[index], error: toLogError(result.reason) }]
      : []
  );
  if (failures.length === 0) return;

  try {
    input.logger.error(
      {
        storeId: input.storeId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        failures,
      },
      "Committed search configuration cache invalidation failed",
    );
  } catch {
    // The database mutation is already committed. Observability failures must
    // not turn a successful mutation into a retryable client-visible error.
  }
}

function toLogError(error: unknown): Record<string, unknown> {
  return error instanceof Error
    ? { name: error.name, message: error.message }
    : { message: String(error) };
}
