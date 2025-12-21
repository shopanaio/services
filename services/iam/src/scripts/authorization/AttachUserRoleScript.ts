import { BaseScript } from "../../kernel/BaseScript.js";
import { getTenantOrg } from "../../constants/index.js";
import type { AttachUserRoleParams, AttachUserRoleResult } from "./dto/index.js";

/**
 * AttachUserRole - Assign a role to a user for a project
 *
 * TENANT ISOLATION:
 * Uses projectId to compute tenantOrg for role assignment.
 *
 * Implementation:
 * 1. Compute tenantOrg from projectId
 * 2. Call Casdoor to add user to role
 * 3. Invalidate cache for this user
 */
export class AttachUserRoleScript extends BaseScript<
  AttachUserRoleParams,
  AttachUserRoleResult
> {
  protected async execute(
    params: AttachUserRoleParams
  ): Promise<AttachUserRoleResult> {
    const { userId, projectId, roleName } = params;

    // Compute tenant organization from projectId
    const tenantOrg = getTenantOrg(projectId);

    try {
      const attached = await this.repository.authorization.attachUserRole(
        tenantOrg,
        userId,
        roleName
      );

      if (!attached) {
        return {
          attached: false,
          userErrors: [
            {
              code: "ATTACH_FAILED",
              message: `Failed to attach role ${roleName} to user ${userId}`,
            },
          ],
        };
      }

      // Invalidate cache for this user
      this.authCache.onUserRoleChange(tenantOrg, userId);

      this.logger.info(
        { userId, projectId, roleName, tenantOrg },
        "AttachUserRoleScript: Role attached successfully"
      );

      return {
        attached: true,
        userErrors: [],
      };
    } catch (error) {
      this.logger.error(
        { error, params },
        "AttachUserRoleScript: Failed to attach role"
      );

      return {
        attached: false,
        userErrors: [
          {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred while attaching role",
          },
        ],
      };
    }
  }

  protected handleError(_error: unknown): AttachUserRoleResult {
    return {
      attached: false,
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred while attaching role",
        },
      ],
    };
  }
}
