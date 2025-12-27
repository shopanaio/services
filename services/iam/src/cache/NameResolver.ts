import { createCache, type Cache } from "cache-manager";

// TODO: Use cache form kernel
/**
 * Cache TTL for name resolution (5 minutes)
 */
const NAME_CACHE_TTL = 5 * 60 * 1000;

/**
 * NameResolver provides cached name → ID resolution for organizations.
 *
 * Used by Policy decorators to resolve organizationName to organizationId.
 * Caching reduces database queries for frequently accessed names.
 *
 * Cache invalidation:
 * - On name change: call invalidateOrganization(oldName)
 * - TTL-based expiration (5 minutes)
 */
export class NameResolver {
  private cache: Cache;

  constructor() {
    this.cache = createCache({
      ttl: NAME_CACHE_TTL,
    });
  }

  /**
   * Cache key for organization name → id
   */
  private orgCacheKey(name: string): string {
    return `name:org:${name}`;
  }

  /**
   * Resolve organization name to ID with caching.
   *
   * @param name - Organization name (e.g., "my-org")
   * @param loader - Function to load organization ID from database
   * @returns Organization ID or null if not found
   */
  async resolveOrganizationId(
    name: string,
    loader: (name: string) => Promise<string | null>
  ): Promise<string | null> {
    const cacheKey = this.orgCacheKey(name);

    // Try cache first
    const cached = await this.cache.get<string>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // Load from database
    const id = await loader(name);

    // Cache result (including null to avoid repeated lookups for non-existent names)
    if (id !== null) {
      await this.cache.set(cacheKey, id);
    }

    return id;
  }

  /**
   * Invalidate cached organization name.
   * Call this when organization name changes.
   */
  async invalidateOrganization(name: string): Promise<void> {
    const cacheKey = this.orgCacheKey(name);
    await this.cache.del(cacheKey);
  }

  /**
   * Clear all cached names (for testing)
   */
  async clear(): Promise<void> {
    // cache-manager v5 doesn't have reset(), recreate cache instead
    this.cache = createCache({
      ttl: NAME_CACHE_TTL,
    });
  }
}
