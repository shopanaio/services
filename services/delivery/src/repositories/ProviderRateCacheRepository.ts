import { and, eq, gt, lt } from "drizzle-orm";
import type { DeliveryRateCachePort } from "../contracts/rates.js";
import { BaseRepository } from "./BaseRepository.js";
import { providerRateCache } from "./models/index.js";

type CacheIdentity = Parameters<DeliveryRateCachePort["get"]>[0];

function cacheKey(input: CacheIdentity): string {
  return [
    input.checkoutId,
    input.basedOnCheckoutVersion,
    input.quoteRequestId,
    input.carrierServiceAccountId,
    input.routeRevision,
    input.carrierServiceConfigurationRevision,
    input.executionPolicyRevision,
    input.eligibilityRevision,
    input.ratedFactsHash,
    input.effectiveAt,
  ].join("|");
}

export class ProviderRateCacheRepository extends BaseRepository implements DeliveryRateCachePort {
  async get(input: Parameters<DeliveryRateCachePort["get"]>[0]) {
    const [row] = await this.connection
      .select()
      .from(providerRateCache)
      .where(
        and(
          eq(providerRateCache.storeId, input.storeId),
          eq(providerRateCache.cacheKey, cacheKey(input)),
          gt(providerRateCache.expiresAt, input.effectiveAt),
        ),
      )
      .limit(1);
    return row
      ? {
          status: "HIT" as const,
          result: row.result,
          cachedAt: row.cachedAt,
          expiresAt: row.expiresAt,
        }
      : { status: "MISS" as const };
  }

  async put(input: Parameters<DeliveryRateCachePort["put"]>[0]): Promise<void> {
    const id = await this.generateUuidV7();
    await this.connection
      .insert(providerRateCache)
      .values({
        id,
        storeId: input.storeId,
        checkoutId: input.checkoutId,
        basedOnCheckoutVersion: input.basedOnCheckoutVersion,
        cacheKey: cacheKey(input),
        result: input.result,
        cachedAt: input.cachedAt,
        expiresAt: input.expiresAt,
      })
      .onConflictDoUpdate({
        target: [providerRateCache.storeId, providerRateCache.cacheKey],
        set: {
          result: input.result,
          cachedAt: input.cachedAt,
          expiresAt: input.expiresAt,
        },
      });
  }

  async deleteExpired(now: string): Promise<number> {
    const rows = await this.connection
      .delete(providerRateCache)
      .where(lt(providerRateCache.expiresAt, now))
      .returning({ id: providerRateCache.id });
    return rows.length;
  }
}
