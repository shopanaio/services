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
 * Custom roles are created in the tenant's isolated Casbin policies.
 * Role names are simple (no organizationId prefix needed).
 */
export class CreateRoleScript extends BaseScript<
  CreateRoleParams,
  CreateRoleResult
> {
  protected async execute(params: CreateRoleParams): Promise<CreateRoleResult> {
    const { organizationId, domain = "*", name, displayName, description, permissions } = params;

    // Validate role name is not empty
    if (!name || name.trim() === "") {
      return {
        role: null,
        userErrors: [
          {
            code: "INVALID_ROLE_NAME",
            message: "Role name is required",
            field: ["name"],
          },
        ],
      };
    }

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

    // Validate displayName is not empty
    if (!displayName || displayName.trim() === "") {
      return {
        role: null,
        userErrors: [
          {
            code: "INVALID_DISPLAY_NAME",
            message: "Display name is required",
            field: ["displayName"],
          },
        ],
      };
    }

    // Validate permissions is not empty
    if (!permissions || permissions.length === 0) {
      return {
        role: null,
        userErrors: [
          {
            code: "INVALID_PERMISSIONS",
            message: "At least one permission is required",
            field: ["permissions"],
          },
        ],
      };
    }

    try {
      // Check if role already exists (in the same domain)
      const existingRole = await this.repository.authorization.getRole(
        organizationId,
        name,
        domain
      );

      if (existingRole) {
        return {
          role: null,
          userErrors: [
            {
              code: "ROLE_EXISTS",
              message: `Role "${name}" already exists in domain "${domain}"`,
              field: ["name"],
            },
          ],
        };
      }

      // Create the role with domain
      const created = await this.repository.authorization.createRole(
        organizationId,
        name,
        displayName,
        description ?? "",
        false, // isSystem
        domain
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
          organizationId,
          name,
          perm.resource,
          perm.actions,
          effect
        );

        if (!permCreated) {
          // Rollback: delete the role
          await this.repository.authorization.deleteRole(organizationId, name, domain);
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
      this.authCache.onRoleUpdate(organizationId, name);

      const roleInfo: RoleInfo = {
        id: created.id,
        domain,
        name,
        displayName,
        description: description ?? "",
        isSystem: false,
        permissions,
      };

      this.logger.info(
        { organizationId, roleName: name },
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
