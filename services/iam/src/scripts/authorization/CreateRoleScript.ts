import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  CreateRoleParams,
  CreateRoleResult,
  RoleInfo,
} from "./dto/index.js";

/**
 * CreateRole - Create a custom role for a project
 *
 * Custom roles are project-specific and fully isolated.
 * Role name will be prefixed with projectId automatically.
 */
export class CreateRoleScript extends BaseScript<
  CreateRoleParams,
  CreateRoleResult
> {
  protected async execute(params: CreateRoleParams): Promise<CreateRoleResult> {
    const { projectId, name, displayName, description, permissions } = params;

    // Validate role name (no special characters, alphanumeric + hyphen)
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      return {
        role: null,
        userErrors: [
          {
            code: "INVALID_ROLE_NAME",
            message:
              "Role name must start with a letter and contain only lowercase letters, numbers, and hyphens",
            field: ["name"],
          },
        ],
      };
    }

    // Build full role name with project prefix
    const fullRoleName = `${projectId}-${name}`;

    try {
      // Check if role already exists
      const existingRole = await this.repository.authorization.getRole(
        projectId,
        fullRoleName
      );

      if (existingRole) {
        return {
          role: null,
          userErrors: [
            {
              code: "ROLE_EXISTS",
              message: `Role "${name}" already exists in this project`,
              field: ["name"],
            },
          ],
        };
      }

      // Create the role
      const created = await this.repository.authorization.createRole(
        projectId,
        fullRoleName,
        displayName,
        description ?? ""
      );

      if (!created) {
        return {
          role: null,
          userErrors: [
            {
              code: "CREATE_FAILED",
              message: "Failed to create role",
            },
          ],
        };
      }

      // Create permissions for the role
      for (const perm of permissions) {
        const permCreated = await this.repository.authorization.createPermission(
          projectId,
          fullRoleName,
          perm.resource,
          perm.actions,
          perm.effect
        );

        if (!permCreated) {
          // Rollback: delete the role
          await this.repository.authorization.deleteRole(fullRoleName);
          return {
            role: null,
            userErrors: [
              {
                code: "PERMISSION_CREATE_FAILED",
                message: `Failed to create permission for resource: ${perm.resource}`,
              },
            ],
          };
        }
      }

      // Invalidate cache for this project's roles
      this.authCache.onRoleUpdate(projectId, fullRoleName);

      const roleInfo: RoleInfo = {
        name: fullRoleName,
        displayName,
        description: description ?? "",
        isSystem: false,
        permissions,
        memberCount: 0,
      };

      this.logger.info(
        { projectId, roleName: fullRoleName },
        "CreateRoleScript: Role created successfully"
      );

      return {
        role: roleInfo,
        userErrors: [],
      };
    } catch (error) {
      this.logger.error(
        { error, params },
        "CreateRoleScript: Failed to create role"
      );

      return {
        role: null,
        userErrors: [
          {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred while creating role",
          },
        ],
      };
    }
  }

  protected handleError(_error: unknown): CreateRoleResult {
    return {
      role: null,
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred while creating role",
        },
      ],
    };
  }
}
