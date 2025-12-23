import { BaseScript } from "../../kernel/BaseScript.js";
import type { AttachUserRoleParams, AttachUserRoleResult } from "./dto/index.js";

/**
 * AttachUserRole - Assign a role to a user in an organization
 *
 * Implementation:
 * 1. Use organizationId (passed from caller)
 * 2. Save to DB and add Casbin grouping policy
 * 3. Invalidate cache for this user
 */
export class AttachUserRoleScript extends BaseScript<
  AttachUserRoleParams,
  AttachUserRoleResult
> {
  protected async execute(
    params: AttachUserRoleParams
  ): Promise<AttachUserRoleResult> {
    const { userId, organizationId, roleName, grantedBy } = params;

    try {
      const attached = await this.repository.authorization.attachUserRole(
        organizationId,
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
      this.authCache.onUserRoleChange(organizationId, userId);

      this.logger.info(
        { userId, organizationId, roleName },
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
