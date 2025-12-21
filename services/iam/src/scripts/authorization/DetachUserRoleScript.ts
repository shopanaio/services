import { BaseScript } from "../../kernel/BaseScript.js";
import { getTenantOrg } from "../../constants/index.js";
import type { DetachUserRoleParams, DetachUserRoleResult } from "./dto/index.js";

/**
 * DetachUserRole - Remove a role from a user
 *
 * TENANT ISOLATION:
 * Uses projectId to compute tenantOrg for role detachment.
 *
 * Implementation:
 * 1. Compute tenantOrg from projectId
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
    const { userId, projectId } = params;

    // Compute tenant organization from projectId
    const tenantOrg = getTenantOrg(projectId);

    try {
      // Get user's current role
      const userRoles = await this.repository.authorization.getUserRoles(
        tenantOrg,
        userId
      );

      if (userRoles.length === 0) {
        return {
          detached: false,
          userErrors: [
            {
              code: "NO_ROLE",
              message: `User ${userId} has no role in project ${projectId}`,
            },
          ],
        };
      }

      const roleName = userRoles[0];

      const detached = await this.repository.authorization.detachUserRole(
        tenantOrg,
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
      this.authCache.onUserRoleChange(tenantOrg, userId);

      this.logger.info(
        { userId, projectId, roleName, tenantOrg },
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
