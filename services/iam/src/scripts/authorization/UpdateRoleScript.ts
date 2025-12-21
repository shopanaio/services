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
 * Uses tenantId (Casdoor organization name from integrations) for role updates.
 *
 * Can update both system and custom roles.
 * System roles can have their permissions modified per tenant.
 */
export class UpdateRoleScript extends BaseScript<
  UpdateRoleParams,
  UpdateRoleResult
> {
  protected async execute(params: UpdateRoleParams): Promise<UpdateRoleResult> {
    const { tenantId, roleName, displayName, description, permissions } = params;

    try {
      // Get existing role
      const existingRole = await this.repository.authorization.getRole(
        tenantId,
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
          tenantId,
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
          tenantId,
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

      // Invalidate cache
      this.authCache.onRoleUpdate(tenantId, roleName);

      // Get updated permissions
      const rolePermissions = await this.repository.authorization.getRolePermissions(
        tenantId,
        roleName
      );

      const mappedPermissions: RolePermission[] = rolePermissions.map((p) => ({
        resource: p.resources?.[0] ?? p.resourceType,
        actions: p.actions ?? [],
        effect: (p.effect as "Allow" | "Deny") ?? "Allow",
      }));

      // Get member count
      const roles = await this.repository.authorization.getRoles(tenantId);
      const role = roles.find((r) => r.name === roleName);
      const memberCount = role?.users?.length ?? 0;

      const isSystem = this.repository.authorization.isSystemRole(roleName);

      const roleInfo: RoleInfo = {
        name: roleName,
        displayName: displayName ?? existingRole.displayName,
        description: description ?? existingRole.description,
        isSystem,
        permissions: permissions ?? mappedPermissions,
        memberCount,
      };

      this.logger.info(
        { tenantId, roleName },
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
