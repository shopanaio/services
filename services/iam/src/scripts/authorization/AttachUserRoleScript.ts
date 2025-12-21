import { BaseScript } from "../../kernel/BaseScript.js";
import type { AttachUserRoleParams, AttachUserRoleResult } from "./dto/index.js";

/**
 * AttachUserRole - Assign a role to a user for a project
 *
 * Implementation:
 * 1. Call Casdoor to add user to role
 * 2. Invalidate cache for this user
 */
export class AttachUserRoleScript extends BaseScript<
  AttachUserRoleParams,
  AttachUserRoleResult
> {
  protected async execute(
    params: AttachUserRoleParams
  ): Promise<AttachUserRoleResult> {
    const { userId, projectId, roleName } = params;

    try {
      const attached = await this.repository.authorization.attachUserRole(
        userId,
        projectId,
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
      this.authCache.onUserRoleChange(projectId, userId);

      this.logger.info(
        { userId, projectId, roleName },
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
