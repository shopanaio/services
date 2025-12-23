import { BaseScript } from "../../kernel/BaseScript.js";
import type { AuthorizeParams, AuthorizeResult } from "./dto/index.js";
import type { ScopePart } from "../../casbin/CasbinService.js";

/**
 * Authorize - Check if user is authorized to perform action on resource
 *
 * ORGANIZATION + DOMAIN ISOLATION:
 * Uses organizationId (from JWT) and projectId (domain) to check authorization.
 * The Casbin model uses 4 parameters: (sub, dom, obj, act)
 *
 * Implementation:
 * 1. Get organizationId (required) and projectId (optional domain)
 * 2. Check cache (L1 in-memory with version validation)
 * 3. If miss → call Casbin enforce() via CasbinService
 * 4. Cache result, return
 */
export class AuthorizeScript extends BaseScript<
  AuthorizeParams,
  AuthorizeResult
> {
  protected async execute(params: AuthorizeParams): Promise<AuthorizeResult> {
    const { userId, resource, action, resourceId, projectId } = params;

    // Support both new organizationId and legacy tenantId
    const organizationId = params.organizationId || params.tenantId;

    if (!organizationId) {
      return {
        allowed: false,
        deniedReason: "Organization context required",
        userErrors: [{ code: "NO_ORG_CONTEXT", message: "organizationId is required" }],
      };
    }

    try {
      // Build domain scope
      const domain: ScopePart[] = projectId ? [["project", projectId]] : [];

      // Build resource path
      const resourcePath: ScopePart[] = resourceId
        ? [[resource, resourceId]]
        : [[resource]];

      // Get user's roles for cache key
      const userRoles = await this.repository.casbin.getRolesForUserInDomain(
        organizationId,
        userId,
        domain
      );
      const roleName = userRoles[0] ?? "";

      // Build cache key with domain
      const cacheKey = projectId ? `${projectId}:${resource}` : resource;

      // Check cache first
      const cached = await this.authCache.getAuthResult(
        organizationId,
        userId,
        roleName,
        cacheKey,
        action
      );

      if (cached.hit) {
        return {
          allowed: cached.allowed!,
          implicitDeny: !cached.allowed,
          userErrors: [],
        };
      }

      // Cache miss - call Casbin with domain support
      const allowed = await this.repository.casbin.enforce(
        organizationId,
        userId,
        domain,
        resourcePath,
        action
      );

      // Cache the result
      await this.authCache.setAuthResult(
        organizationId,
        userId,
        roleName,
        cacheKey,
        action,
        allowed
      );

      return {
        allowed,
        implicitDeny: !allowed,
        deniedReason: allowed ? undefined : "Permission denied by policy",
        userErrors: [],
      };
    } catch (error) {
      this.logger.error(
        { error, params },
        "AuthorizeScript: Failed to check authorization"
      );

      // Fail-closed: deny access on error
      return {
        allowed: false,
        deniedReason: "Authorization service unavailable",
        userErrors: [],
      };
    }
  }

  protected handleError(_error: unknown): AuthorizeResult {
    // Fail-closed: deny access on error
    return {
      allowed: false,
      deniedReason: "Internal authorization error",
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred during authorization",
        },
      ],
    };
  }
}
