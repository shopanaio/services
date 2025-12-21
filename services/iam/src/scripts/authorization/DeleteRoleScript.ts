import { BaseScript } from "../../kernel/BaseScript.js";
import type { DeleteRoleParams, DeleteRoleResult } from "./dto/index.js";

/**
 * DeleteRole - Delete a custom role from a project
 *
 * System roles cannot be deleted.
 * Roles with assigned users cannot be deleted.
 */
export class DeleteRoleScript extends BaseScript<
  DeleteRoleParams,
  DeleteRoleResult
> {
  protected async execute(params: DeleteRoleParams): Promise<DeleteRoleResult> {
    const { projectId, roleName } = params;

    try {
      // Check if role exists
      const existingRole = await this.repository.authorization.getRole(
        projectId,
        roleName
      );

      if (!existingRole) {
        return {
          deleted: false,
          userErrors: [
            {
              code: "ROLE_NOT_FOUND",
              message: `Role "${roleName}" not found in this project`,
              field: ["roleName"],
            },
          ],
        };
      }

      // Check if it's a system role
      const isSystem = this.repository.authorization.isSystemRole(roleName, projectId);
      if (isSystem) {
        return {
          deleted: false,
          userErrors: [
            {
              code: "CANNOT_DELETE_SYSTEM_ROLE",
              message: "System roles cannot be deleted",
              field: ["roleName"],
            },
          ],
        };
      }

      // Check if role has members
      if (existingRole.users && existingRole.users.length > 0) {
        return {
          deleted: false,
          userErrors: [
            {
              code: "ROLE_HAS_MEMBERS",
              message: `Role "${roleName}" has ${existingRole.users.length} member(s). Remove all members before deleting.`,
              field: ["roleName"],
            },
          ],
        };
      }

      // Delete all permissions for this role first
      const permissions = await this.repository.authorization.getRolePermissions(
        projectId,
        roleName
      );

      for (const perm of permissions) {
        await this.repository.authorization.deletePermission(perm.name);
      }

      // Delete the role
      const deleted = await this.repository.authorization.deleteRole(roleName);

      if (!deleted) {
        return {
          deleted: false,
          userErrors: [
            {
              code: "DELETE_FAILED",
              message: "Failed to delete role",
            },
          ],
        };
      }

      // Invalidate cache
      this.authCache.onRoleDelete(projectId, roleName);

      this.logger.info(
        { projectId, roleName },
        "DeleteRoleScript: Role deleted successfully"
      );

      return {
        deleted: true,
        userErrors: [],
      };
    } catch (error) {
      this.logger.error(
        { error, params },
        "DeleteRoleScript: Failed to delete role"
      );

      return {
        deleted: false,
        userErrors: [
          {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred while deleting role",
          },
        ],
      };
    }
  }

  protected handleError(_error: unknown): DeleteRoleResult {
    return {
      deleted: false,
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred while deleting role",
        },
      ],
    };
  }
}
