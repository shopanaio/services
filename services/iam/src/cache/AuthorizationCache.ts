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
 * ORGANIZATION ISOLATION:
 * Cache keys use organizationId for proper isolation.
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
   * @param organizationId - Tenant organization (e.g., "org-project-a")
   */
  private authCacheKey(
    organizationId: string,
    userId: string,
    resource: string,
    action: string
  ): string {
    return `${CACHE_KEYS.AUTH}:${organizationId}:${userId}:${resource}:${action}`;
  }

  /**
   * Cache key for user role
   * @param organizationId - Tenant organization
   */
  private userRoleCacheKey(organizationId: string, userId: string): string {
    return `${CACHE_KEYS.USER_ROLE}:${organizationId}:${userId}`;
  }

  /**
   * Version key for role
   * @param organizationId - Tenant organization
   */
  private roleVersionKey(organizationId: string, roleName: string): string {
    return `${CACHE_KEYS.ROLE_VERSION}:${organizationId}:${roleName}`;
  }

  /**
   * Version key for user
   * @param organizationId - Tenant organization
   */
  private userVersionKey(organizationId: string, userId: string): string {
    return `${CACHE_KEYS.USER_VERSION}:${organizationId}:${userId}`;
  }

  // ============================================================================
  // Version Methods
  // ============================================================================

  /**
   * Get current role version
   * @param organizationId - Tenant organization
   */
  getRoleVersion(organizationId: string, roleName: string): number {
    const key = this.roleVersionKey(organizationId, roleName);
    return this.roleVersions.get(key) ?? 0;
  }

  /**
   * Get current user version
   * @param organizationId - Tenant organization
   */
  getUserVersion(organizationId: string, userId: string): number {
    const key = this.userVersionKey(organizationId, userId);
    return this.userVersions.get(key) ?? 0;
  }

  /**
   * Increment role version (on role update/delete)
   * @param organizationId - Tenant organization
   */
  incrementRoleVersion(organizationId: string, roleName: string): number {
    const key = this.roleVersionKey(organizationId, roleName);
    const newVersion = (this.roleVersions.get(key) ?? 0) + 1;
    this.roleVersions.set(key, newVersion);
    return newVersion;
  }

  /**
   * Increment user version (on attach/detach role)
   * @param organizationId - Tenant organization
   */
  incrementUserVersion(organizationId: string, userId: string): number {
    const key = this.userVersionKey(organizationId, userId);
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
   * @param organizationId - Tenant organization
   * Returns null if cache miss or version mismatch
   */
  async getAuthResult(
    organizationId: string,
    userId: string,
    roleName: string,
    resource: string,
    action: string
  ): Promise<{ hit: boolean; allowed?: boolean }> {
    const cacheKey = this.authCacheKey(organizationId, userId, resource, action);

    const cached = await this.l1Cache.get<CachedAuthResult>(cacheKey);
    if (!cached) {
      return { hit: false };
    }

    // Validate versions
    const isValid = this.validateVersions(organizationId, userId, roleName, cached);
    if (!isValid) {
      // Version mismatch - invalidate cache
      await this.l1Cache.del(cacheKey);
      return { hit: false };
    }

    return { hit: true, allowed: cached.allowed };
  }

  /**
   * Set cached authorization result
   * @param organizationId - Tenant organization
   */
  async setAuthResult(
    organizationId: string,
    userId: string,
    roleName: string,
    resource: string,
    action: string,
    allowed: boolean
  ): Promise<void> {
    const cacheKey = this.authCacheKey(organizationId, userId, resource, action);

    const cached: CachedAuthResult = {
      allowed,
      checkedAt: Date.now(),
      userVersion: this.getUserVersion(organizationId, userId),
      roleVersion: this.getRoleVersion(organizationId, roleName),
    };

    await this.l1Cache.set(cacheKey, cached);
  }

  // ============================================================================
  // User Role Cache Methods
  // ============================================================================

  /**
   * Get cached user role
   * @param organizationId - Tenant organization
   */
  async getUserRole(
    organizationId: string,
    userId: string,
    roleName: string
  ): Promise<CachedUserRole | null> {
    const cacheKey = this.userRoleCacheKey(organizationId, userId);

    const cached = await this.l1Cache.get<CachedUserRole>(cacheKey);
    if (!cached) {
      return null;
    }

    // Validate versions
    const isValid = this.validateVersions(organizationId, userId, roleName, cached);
    if (!isValid) {
      await this.l1Cache.del(cacheKey);
      return null;
    }

    return cached;
  }

  /**
   * Set cached user role
   * @param organizationId - Tenant organization
   */
  async setUserRole(
    organizationId: string,
    userId: string,
    roleName: string,
    role: string | null,
    permissions: string[]
  ): Promise<void> {
    const cacheKey = this.userRoleCacheKey(organizationId, userId);

    const cached: CachedUserRole = {
      role,
      permissions,
      userVersion: this.getUserVersion(organizationId, userId),
      roleVersion: this.getRoleVersion(organizationId, roleName),
    };

    await this.l1Cache.set(cacheKey, cached);
  }

  // ============================================================================
  // Invalidation Methods
  // ============================================================================

  /**
   * Invalidate cache on user role change (attach/detach)
   * @param organizationId - Tenant organization
   */
  onUserRoleChange(organizationId: string, userId: string): void {
    this.incrementUserVersion(organizationId, userId);
    // L1 cache will be invalidated on next access via version check
  }

  /**
   * Invalidate cache on role update
   * @param organizationId - Tenant organization
   */
  onRoleUpdate(organizationId: string, roleName: string): void {
    this.incrementRoleVersion(organizationId, roleName);
    // All cached auth results for users with this role will be invalidated
    // on next access via version check
  }

  /**
   * Invalidate cache on role delete
   * @param organizationId - Tenant organization
   */
  onRoleDelete(organizationId: string, roleName: string): void {
    this.incrementRoleVersion(organizationId, roleName);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private validateVersions(
    organizationId: string,
    userId: string,
    roleName: string,
    cached: { userVersion: number; roleVersion: number }
  ): boolean {
    const currentUserVersion = this.getUserVersion(organizationId, userId);
    const currentRoleVersion = this.getRoleVersion(organizationId, roleName);

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
