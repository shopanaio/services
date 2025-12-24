import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  ListRolesParams,
  ListRolesResult,
  RoleInfo,
  RolePermission,
} from "./dto/index.js";

/**
 * ListRoles - List all roles for a tenant
 *
 * TENANT ISOLATION:
 * Uses organizationId for role listing from local PostgreSQL.
 *
 * Returns both system and custom roles with their permissions.
 */
export class ListRolesScript extends BaseScript<
  ListRolesParams,
  ListRolesResult
> {
  protected async execute(params: ListRolesParams): Promise<ListRolesResult> {
    const { organizationId } = params;

    try {
      const roles = await this.repository.authorization.getRoles(organizationId);

      const roleInfos: RoleInfo[] = [];

      for (const role of roles) {
        // Get permissions for this role (returns Casbin policy arrays)
        const policies = await this.repository.authorization.getRolePermissions(
          organizationId,
          role.name
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

        roleInfos.push({
          id: role.id,
          domain: role.domain,
          name: role.name,
          displayName: role.displayName ?? role.name,
          description: role.description ?? "",
          isSystem: role.isSystem,
          permissions: mappedPermissions,
          createdAt: role.createdAt,
        });
      }

      // Sort: system roles first, then alphabetically
      roleInfos.sort((a, b) => {
        if (a.isSystem !== b.isSystem) {
          return a.isSystem ? -1 : 1;
        }
        return a.displayName.localeCompare(b.displayName);
      });

      return {
        roles: roleInfos,
        userErrors: [],
      };
    } catch (error) {
      this.logger.error(
        { error, params },
        "ListRolesScript: Failed to list roles"
      );

      return {
        roles: [],
        userErrors: [
          {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred while listing roles",
          },
        ],
      };
    }
  }

  protected handleError(_error: unknown): ListRolesResult {
    return {
      roles: [],
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred while listing roles",
        },
      ],
    };
  }
}
