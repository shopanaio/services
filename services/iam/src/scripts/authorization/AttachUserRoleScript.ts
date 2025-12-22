import { BaseScript } from "../../kernel/BaseScript.js";
import type { AttachUserRoleParams, AttachUserRoleResult } from "./dto/index.js";

/**
 * AttachUserRole - Assign a role to a user for a tenant
 *
 * TENANT ISOLATION:
 * Uses tenantId (Casdoor organization name from integrations) for role assignment.
 *
 * Implementation:
 * 1. Use tenantId directly (passed from caller)
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
    const { userId, tenantId, roleName, grantedBy } = params;

    try {
      const attached = await this.repository.authorization.attachUserRole(
        tenantId,
        userId,
        roleName,
        grantedBy
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
      this.authCache.onUserRoleChange(tenantId, userId);

      this.logger.info(
        { userId, tenantId, roleName },
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
