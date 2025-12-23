import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  UpdateRoleParams,
  UpdateRoleResult,
  RoleInfo,
  RolePermission,
} from "./dto/index.js";

/**
 * UpdateRole - Update role metadata and/or permissions
 *
 * TENANT ISOLATION:
 * Uses organizationId for role updates in local PostgreSQL.
 *
 * Can update both system and custom roles.
 * System roles can have their permissions modified per tenant.
 */
export class UpdateRoleScript extends BaseScript<
  UpdateRoleParams,
  UpdateRoleResult
> {
  protected async execute(params: UpdateRoleParams): Promise<UpdateRoleResult> {
    const { organizationId, roleName, displayName, description, permissions, inherits } = params;

    try {
      // Check if it's a system role - system roles cannot be modified
      const isSystem = this.repository.authorization.isSystemRole(roleName);
      if (isSystem) {
        return {
          role: null,
          userErrors: [
            {
              code: "CANNOT_MODIFY_SYSTEM_ROLE",
              message: "System roles cannot be modified",
              field: ["roleName"],
            },
          ],
        };
      }

      // Get existing role
      const existingRole = await this.repository.authorization.getRole(
        organizationId,
        roleName
      );

      if (!existingRole) {
        return {
          role: null,
          userErrors: [
            {
              code: "ROLE_NOT_FOUND",
              message: `Role "${roleName}" not found in this tenant`,
              field: ["roleName"],
            },
          ],
        };
      }

      // Update role metadata if provided
      if (displayName !== undefined || description !== undefined) {
        const updated = await this.repository.authorization.updateRole(
          organizationId,
          roleName,
          {
            displayName,
            description,
          }
        );

        if (!updated) {
          return {
            role: null,
            userErrors: [
              {
                code: "UPDATE_FAILED",
                message: "Failed to update role metadata",
              },
            ],
          };
        }
      }

      // Update permissions if provided
      if (permissions !== undefined) {
        const result = await this.repository.authorization.updateRolePermissions(
          organizationId,
          roleName,
          permissions
        );

        if (!result.success) {
          return {
            role: null,
            userErrors: [
              {
                code: "PERMISSIONS_UPDATE_FAILED",
                message: result.error ?? "Failed to update permissions",
              },
            ],
          };
        }
      }

      // Update inherits if provided
      if (inherits !== undefined) {
        const result = await this.repository.authorization.updateRoleInherits(
          organizationId,
          roleName,
          inherits
        );

        if (!result.success) {
          return {
            role: null,
            userErrors: [
              {
                code: "INHERITS_UPDATE_FAILED",
                message: result.error ?? "Failed to update role hierarchy",
              },
            ],
          };
        }
      }

      // Invalidate cache
      this.authCache.onRoleUpdate(organizationId, roleName);

      // Get updated permissions from Casbin policies
      const policies = await this.repository.authorization.getRolePermissions(
        organizationId,
        roleName
      );

      // Map Casbin policies [role, resource, action, effect, tenant] to RolePermission
      const permissionMap = new Map<string, { actions: string[]; effect: "Allow" | "Deny" }>();

      for (const policy of policies) {
        const [, resource, action, effect] = policy;
        const key = `${resource}:${effect}`;

        if (!permissionMap.has(key)) {
          permissionMap.set(key, {
            actions: [],
            effect: effect === "deny" ? "Deny" : "Allow",
          });
        }
        permissionMap.get(key)!.actions.push(action);
      }

      const mappedPermissions: RolePermission[] = [];
      for (const [key, value] of permissionMap) {
        const resource = key.split(":")[0];
        mappedPermissions.push({
          resource,
          actions: value.actions,
          effect: value.effect,
        });
      }

      // Get updated inherits
      const updatedInherits = await this.repository.authorization.getRoleInherits(
        organizationId,
        roleName
      );

      const roleInfo: RoleInfo = {
        name: roleName,
        displayName: displayName ?? existingRole.displayName ?? roleName,
        description: description ?? existingRole.description ?? "",
        isSystem: false, // Only custom roles can be updated
        inherits: updatedInherits,
        permissions: permissions ?? mappedPermissions,
        createdAt: existingRole.createdAt,
      };

      this.logger.info(
        { organizationId, roleName },
        "UpdateRoleScript: Role updated successfully"
      );

      return {
        role: roleInfo,
        userErrors: [],
      };
    } catch (error) {
      this.logger.error(
        { error, params },
        "UpdateRoleScript: Failed to update role"
      );

      return {
        role: null,
        userErrors: [
          {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred while updating role",
          },
        ],
      };
    }
  }

  protected handleError(_error: unknown): UpdateRoleResult {
    return {
      role: null,
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred while updating role",
        },
      ],
    };
  }
}
