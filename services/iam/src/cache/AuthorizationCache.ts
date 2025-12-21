import { createCache, type Cache } from "cache-manager";
import { CACHE_TTL, CACHE_KEYS } from "../constants/index.js";

/**
 * Cached authorization result
 */
interface CachedAuthResult {
  allowed: boolean;
  checkedAt: number;
  userVersion: number;
  roleVersion: number;
}

/**
 * Cached user role
 */
interface CachedUserRole {
  role: string | null;
  permissions: string[];
  userVersion: number;
  roleVersion: number;
}

/**
 * AuthorizationCache implements version-based cache invalidation
 *
 * TENANT ISOLATION:
 * Cache keys use tenantOrg instead of projectId for proper isolation.
 *
 * Cache uses version-based invalidation instead of active cache deletion:
 * - Avoids O(n) Redis operations when updating roles
 * - Uses TTL for automatic memory cleanup
 * - Prevents race conditions during invalidation
 *
 * Cache layers:
 * - L1: In-memory cache (TTL: 10s)
 * - L2: Redis cache (TTL: 5min) - TODO: implement when Redis is added
 */
export class AuthorizationCache {
  private l1Cache: Cache;

  // Version tracking (in-memory for now, will be moved to Redis)
  private roleVersions: Map<string, number> = new Map();
  private userVersions: Map<string, number> = new Map();

  constructor() {
    // L1 in-memory cache
    this.l1Cache = createCache({
      ttl: CACHE_TTL.L1,
    });
  }

  // ============================================================================
  // Cache Key Helpers
  // ============================================================================

  /**
   * Cache key for authorization result
   * @param tenantOrg - Tenant organization (e.g., "org-project-a")
   */
  private authCacheKey(
    tenantOrg: string,
    userId: string,
    resource: string,
    action: string
  ): string {
    return `${CACHE_KEYS.AUTH}:${tenantOrg}:${userId}:${resource}:${action}`;
  }

  /**
   * Cache key for user role
   * @param tenantOrg - Tenant organization
   */
  private userRoleCacheKey(tenantOrg: string, userId: string): string {
    return `${CACHE_KEYS.USER_ROLE}:${tenantOrg}:${userId}`;
  }

  /**
   * Version key for role
   * @param tenantOrg - Tenant organization
   */
  private roleVersionKey(tenantOrg: string, roleName: string): string {
    return `${CACHE_KEYS.ROLE_VERSION}:${tenantOrg}:${roleName}`;
  }

  /**
   * Version key for user
   * @param tenantOrg - Tenant organization
   */
  private userVersionKey(tenantOrg: string, userId: string): string {
    return `${CACHE_KEYS.USER_VERSION}:${tenantOrg}:${userId}`;
  }

  // ============================================================================
  // Version Methods
  // ============================================================================

  /**
   * Get current role version
   * @param tenantOrg - Tenant organization
   */
  getRoleVersion(tenantOrg: string, roleName: string): number {
    const key = this.roleVersionKey(tenantOrg, roleName);
    return this.roleVersions.get(key) ?? 0;
  }

  /**
   * Get current user version
   * @param tenantOrg - Tenant organization
   */
  getUserVersion(tenantOrg: string, userId: string): number {
    const key = this.userVersionKey(tenantOrg, userId);
    return this.userVersions.get(key) ?? 0;
  }

  /**
   * Increment role version (on role update/delete)
   * @param tenantOrg - Tenant organization
   */
  incrementRoleVersion(tenantOrg: string, roleName: string): number {
    const key = this.roleVersionKey(tenantOrg, roleName);
    const newVersion = (this.roleVersions.get(key) ?? 0) + 1;
    this.roleVersions.set(key, newVersion);
    return newVersion;
  }

  /**
   * Increment user version (on attach/detach role)
   * @param tenantOrg - Tenant organization
   */
  incrementUserVersion(tenantOrg: string, userId: string): number {
    const key = this.userVersionKey(tenantOrg, userId);
    const newVersion = (this.userVersions.get(key) ?? 0) + 1;
    this.userVersions.set(key, newVersion);
    return newVersion;
  }

  // ============================================================================
  // Authorization Cache Methods
  // ============================================================================

  /**
   * Get cached authorization result
   *
   * @param tenantOrg - Tenant organization
   * Returns null if cache miss or version mismatch
   */
  async getAuthResult(
    tenantOrg: string,
    userId: string,
    roleName: string,
    resource: string,
    action: string
  ): Promise<{ hit: boolean; allowed?: boolean }> {
    const cacheKey = this.authCacheKey(tenantOrg, userId, resource, action);

    const cached = await this.l1Cache.get<CachedAuthResult>(cacheKey);
    if (!cached) {
      return { hit: false };
    }

    // Validate versions
    const isValid = this.validateVersions(tenantOrg, userId, roleName, cached);
    if (!isValid) {
      // Version mismatch - invalidate cache
      await this.l1Cache.del(cacheKey);
      return { hit: false };
    }

    return { hit: true, allowed: cached.allowed };
  }

  /**
   * Set cached authorization result
   * @param tenantOrg - Tenant organization
   */
  async setAuthResult(
    tenantOrg: string,
    userId: string,
    roleName: string,
    resource: string,
    action: string,
    allowed: boolean
  ): Promise<void> {
    const cacheKey = this.authCacheKey(tenantOrg, userId, resource, action);

    const cached: CachedAuthResult = {
      allowed,
      checkedAt: Date.now(),
      userVersion: this.getUserVersion(tenantOrg, userId),
      roleVersion: this.getRoleVersion(tenantOrg, roleName),
    };

    await this.l1Cache.set(cacheKey, cached);
  }

  // ============================================================================
  // User Role Cache Methods
  // ============================================================================

  /**
   * Get cached user role
   * @param tenantOrg - Tenant organization
   */
  async getUserRole(
    tenantOrg: string,
    userId: string,
    roleName: string
  ): Promise<CachedUserRole | null> {
    const cacheKey = this.userRoleCacheKey(tenantOrg, userId);

    const cached = await this.l1Cache.get<CachedUserRole>(cacheKey);
    if (!cached) {
      return null;
    }

    // Validate versions
    const isValid = this.validateVersions(tenantOrg, userId, roleName, cached);
    if (!isValid) {
      await this.l1Cache.del(cacheKey);
      return null;
    }

    return cached;
  }

  /**
   * Set cached user role
   * @param tenantOrg - Tenant organization
   */
  async setUserRole(
    tenantOrg: string,
    userId: string,
    roleName: string,
    role: string | null,
    permissions: string[]
  ): Promise<void> {
    const cacheKey = this.userRoleCacheKey(tenantOrg, userId);

    const cached: CachedUserRole = {
      role,
      permissions,
      userVersion: this.getUserVersion(tenantOrg, userId),
      roleVersion: this.getRoleVersion(tenantOrg, roleName),
    };

    await this.l1Cache.set(cacheKey, cached);
  }

  // ============================================================================
  // Invalidation Methods
  // ============================================================================

  /**
   * Invalidate cache on user role change (attach/detach)
   * @param tenantOrg - Tenant organization
   */
  onUserRoleChange(tenantOrg: string, userId: string): void {
    this.incrementUserVersion(tenantOrg, userId);
    // L1 cache will be invalidated on next access via version check
  }

  /**
   * Invalidate cache on role update
   * @param tenantOrg - Tenant organization
   */
  onRoleUpdate(tenantOrg: string, roleName: string): void {
    this.incrementRoleVersion(tenantOrg, roleName);
    // All cached auth results for users with this role will be invalidated
    // on next access via version check
  }

  /**
   * Invalidate cache on role delete
   * @param tenantOrg - Tenant organization
   */
  onRoleDelete(tenantOrg: string, roleName: string): void {
    this.incrementRoleVersion(tenantOrg, roleName);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private validateVersions(
    tenantOrg: string,
    userId: string,
    roleName: string,
    cached: { userVersion: number; roleVersion: number }
  ): boolean {
    const currentUserVersion = this.getUserVersion(tenantOrg, userId);
    const currentRoleVersion = this.getRoleVersion(tenantOrg, roleName);

    return (
      cached.userVersion === currentUserVersion &&
      cached.roleVersion === currentRoleVersion
    );
  }

  /**
   * Clear all cache (for testing)
   */
  async clear(): Promise<void> {
    // cache-manager doesn't have reset(), use clear() or delete individual keys
    // For now, just clear in-memory version maps
    this.roleVersions.clear();
    this.userVersions.clear();
  }
}
