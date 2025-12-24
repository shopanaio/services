import { BaseScript } from "../../kernel/BaseScript.js";
import type { DeleteRoleParams, DeleteRoleResult } from "./dto/index.js";

/**
 * DeleteRole - Delete a custom role from a tenant
 *
 * TENANT ISOLATION:
 * Uses organizationId (project slug) for role deletion.
 *
 * System roles cannot be deleted.
 * Roles with assigned users cannot be deleted.
 */
export class DeleteRoleScript extends BaseScript<
  DeleteRoleParams,
  DeleteRoleResult
> {
  protected async execute(params: DeleteRoleParams): Promise<DeleteRoleResult> {
    const { organizationId, domain = "*", roleName } = params;

    try {
      // Check if role exists
      const existingRole = await this.repository.authorization.getRole(
        organizationId,
        roleName,
        domain
      );

      if (!existingRole) {
        return {
          deleted: false,
          userErrors: [
            {
              code: "ROLE_NOT_FOUND",
              message: `Role "${roleName}" not found in this tenant`,
              field: ["roleName"],
            },
          ],
        };
      }

      // Check if it's a system role
      const isSystem = this.repository.authorization.isSystemRole(roleName);
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

      // Check if role has members (users assigned to this role)
      const usersWithRole = await this.repository.casbin.getUsersForRole(
        organizationId,
        roleName
      );
      if (usersWithRole && usersWithRole.length > 0) {
        return {
          deleted: false,
          userErrors: [
            {
              code: "ROLE_HAS_MEMBERS",
              message: `Role "${roleName}" has ${usersWithRole.length} member(s). Remove all members before deleting.`,
              field: ["roleName"],
            },
          ],
        };
      }

      // Delete the role (also removes all Casbin policies for this role)
      const deleted = await this.repository.authorization.deleteRole(organizationId, roleName, domain);

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
      this.authCache.onRoleDelete(organizationId, roleName);

      this.logger.info(
        { organizationId, roleName },
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
