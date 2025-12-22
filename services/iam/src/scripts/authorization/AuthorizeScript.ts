import { BaseScript } from "../../kernel/BaseScript.js";
import type { AuthorizeParams, AuthorizeResult } from "./dto/index.js";

/**
 * Authorize - Check if user is authorized to perform action on resource
 *
 * TENANT ISOLATION:
 * Uses tenantId (project slug) to check authorization within
 * the tenant's isolated Casbin policies.
 *
 * Implementation:
 * 1. Use tenantId directly (passed from caller)
 * 2. Check cache (L1 in-memory with version validation)
 * 3. If miss → call Casbin enforce() via CasbinService
 * 4. Cache result, return
 */
export class AuthorizeScript extends BaseScript<
  AuthorizeParams,
  AuthorizeResult
> {
  protected async execute(params: AuthorizeParams): Promise<AuthorizeResult> {
    const { userId, tenantId, resource, action } = params;

    try {
      // First, get user's role to validate cache versions
      const userRoles = await this.repository.authorization.getUserRoles(
        tenantId,
        userId
      );
      const roleName = userRoles[0] ?? ""; // Primary role

      // Check cache first
      const cached = await this.authCache.getAuthResult(
        tenantId,
        userId,
        roleName,
        resource,
        action
      );

      if (cached.hit) {
        return {
          allowed: cached.allowed!,
          implicitDeny: !cached.allowed,
          userErrors: [],
        };
      }

      // Cache miss - call Casbin
      const allowed = await this.repository.authorization.enforce(
        tenantId,
        userId,
        resource,
        action
      );

      // Cache the result
      await this.authCache.setAuthResult(
        tenantId,
        userId,
        roleName,
        resource,
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
