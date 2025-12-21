import { BaseScript } from "../../kernel/BaseScript.js";
import type { AuthorizeParams, AuthorizeResult } from "./dto/index.js";

/**
 * Authorize - Check if user is authorized to perform action on resource
 *
 * Implementation:
 * 1. Check cache (L1 in-memory with version validation)
 * 2. If miss → call Casdoor enforce() API
 * 3. Cache result, return
 */
export class AuthorizeScript extends BaseScript<
  AuthorizeParams,
  AuthorizeResult
> {
  protected async execute(params: AuthorizeParams): Promise<AuthorizeResult> {
    const { userId, projectId, resource, action } = params;

    try {
      // First, get user's role to validate cache versions
      const userRoles = await this.repository.authorization.getUserRoles(
        userId,
        projectId
      );
      const roleName = userRoles[0] ?? ""; // Primary role

      // Check cache first
      const cached = await this.authCache.getAuthResult(
        projectId,
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
        userId,
        projectId,
        resource,
        action
      );

      // Cache the result
      await this.authCache.setAuthResult(
        projectId,
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
