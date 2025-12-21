import { BaseScript } from "../../kernel/BaseScript.js";
import type { DetachUserRoleParams, DetachUserRoleResult } from "./dto/index.js";

/**
 * DetachUserRole - Remove a role from a user
 *
 * TENANT ISOLATION:
 * Uses tenantId (Casdoor organization name from integrations) for role detachment.
 *
 * Implementation:
 * 1. Use tenantId directly (passed from caller)
 * 2. Get user's current role
 * 3. Call Casdoor to remove user from role
 * 4. Invalidate cache for this user
 */
export class DetachUserRoleScript extends BaseScript<
  DetachUserRoleParams,
  DetachUserRoleResult
> {
  protected async execute(
    params: DetachUserRoleParams
  ): Promise<DetachUserRoleResult> {
    const { userId, tenantId } = params;

    try {
      // Get user's current role
      const userRoles = await this.repository.authorization.getUserRoles(
        tenantId,
        userId
      );

      if (userRoles.length === 0) {
        return {
          detached: false,
          userErrors: [
            {
              code: "NO_ROLE",
              message: `User ${userId} has no role in tenant ${tenantId}`,
            },
          ],
        };
      }

      const roleName = userRoles[0];

      const detached = await this.repository.authorization.detachUserRole(
        tenantId,
        userId,
        roleName
      );

      if (!detached) {
        return {
          detached: false,
          userErrors: [
            {
              code: "DETACH_FAILED",
              message: `Failed to detach role ${roleName} from user ${userId}`,
            },
          ],
        };
      }

      // Invalidate cache for this user
      this.authCache.onUserRoleChange(tenantId, userId);

      this.logger.info(
        { userId, tenantId, roleName },
        "DetachUserRoleScript: Role detached successfully"
      );

      return {
        detached: true,
        userErrors: [],
      };
    } catch (error) {
      this.logger.error(
        { error, params },
        "DetachUserRoleScript: Failed to detach role"
      );

      return {
        detached: false,
        userErrors: [
          {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred while detaching role",
          },
        ],
      };
    }
  }

  protected handleError(_error: unknown): DetachUserRoleResult {
    return {
      detached: false,
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred while detaching role",
        },
      ],
    };
  }
}
