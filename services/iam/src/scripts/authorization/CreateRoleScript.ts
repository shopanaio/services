import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  CreateRoleParams,
  CreateRoleResult,
  RoleInfo,
} from "./dto/index.js";

/**
 * CreateRole - Create a custom role for a tenant
 *
 * TENANT ISOLATION:
 * Custom roles are created in the tenant's Casdoor organization.
 * Role names are simple (no tenantId prefix needed).
 */
export class CreateRoleScript extends BaseScript<
  CreateRoleParams,
  CreateRoleResult
> {
  protected async execute(params: CreateRoleParams): Promise<CreateRoleResult> {
    const { tenantId, name, displayName, description, permissions } = params;

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

    try {
      // Check if role already exists
      const existingRole = await this.repository.authorization.getRole(
        tenantId,
        name
      );

      if (existingRole) {
        return {
          role: null,
          userErrors: [
            {
              code: "ROLE_EXISTS",
              message: `Role "${name}" already exists in this tenant`,
              field: ["name"],
            },
          ],
        };
      }

      // Create the role with simple name
      const created = await this.repository.authorization.createRole(
        tenantId,
        name,
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
        const effect = perm.effect.toLowerCase() as "allow" | "deny";
        const permCreated = await this.repository.authorization.createPermission(
          tenantId,
          name,
          perm.resource,
          perm.actions,
          effect
        );

        if (!permCreated) {
          // Rollback: delete the role
          await this.repository.authorization.deleteRole(tenantId, name);
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

      // Invalidate cache for this tenant's roles
      this.authCache.onRoleUpdate(tenantId, name);

      const roleInfo: RoleInfo = {
        name,
        displayName,
        description: description ?? "",
        isSystem: false,
        inherits: [],
        permissions,
      };

      this.logger.info(
        { tenantId, roleName: name },
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
