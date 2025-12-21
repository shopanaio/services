import { BaseScript } from "../../kernel/BaseScript.js";
import { getTenantOrg } from "../../constants/index.js";
import type { AuthorizeParams, AuthorizeResult } from "./dto/index.js";

/**
 * Authorize - Check if user is authorized to perform action on resource
 *
 * TENANT ISOLATION:
 * Uses projectId to compute tenantOrg, then checks authorization
 * within the tenant's isolated Casdoor organization.
 *
 * Implementation:
 * 1. Compute tenantOrg from projectId
 * 2. Check cache (L1 in-memory with version validation)
 * 3. If miss → call Casdoor enforce() API
 * 4. Cache result, return
 */
export class AuthorizeScript extends BaseScript<
  AuthorizeParams,
  AuthorizeResult
> {
  protected async execute(params: AuthorizeParams): Promise<AuthorizeResult> {
    const { userId, projectId, resource, action } = params;

    // Compute tenant organization from projectId
    const tenantOrg = getTenantOrg(projectId);

    try {
      // First, get user's role to validate cache versions
      const userRoles = await this.repository.authorization.getUserRoles(
        tenantOrg,
        userId
      );
      const roleName = userRoles[0] ?? ""; // Primary role

      // Check cache first
      const cached = await this.authCache.getAuthResult(
        tenantOrg,
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

      // Cache miss - call Casdoor
      const allowed = await this.repository.authorization.enforce(
        tenantOrg,
        userId,
        resource,
        action
      );

      // Cache the result
      await this.authCache.setAuthResult(
        tenantOrg,
        userId,
        roleName,
        resource,
        action,
        allowed
      );

      return {
        allowed,
        implicitDeny: !allowed,
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
