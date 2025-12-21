import { BaseScript } from "../../kernel/BaseScript.js";
import { getTenantOrg } from "../../constants/index.js";
import type {
  ListRolesParams,
  ListRolesResult,
  RoleInfo,
  RolePermission,
} from "./dto/index.js";

/**
 * ListRoles - List all roles for a project
 *
 * TENANT ISOLATION:
 * Uses projectId to compute tenantOrg for role listing.
 *
 * Returns both system and custom roles with their permissions.
 */
export class ListRolesScript extends BaseScript<
  ListRolesParams,
  ListRolesResult
> {
  protected async execute(params: ListRolesParams): Promise<ListRolesResult> {
    const { projectId } = params;

    // Compute tenant organization from projectId
    const tenantOrg = getTenantOrg(projectId);

    try {
      const roles = await this.repository.authorization.getRoles(tenantOrg);

      const roleInfos: RoleInfo[] = [];

      for (const role of roles) {
        // Get permissions for this role
        const permissions = await this.repository.authorization.getRolePermissions(
          tenantOrg,
          role.name
        );

        const mappedPermissions: RolePermission[] = permissions.map((p) => ({
          resource: p.resources?.[0] ?? p.resourceType,
          actions: p.actions ?? [],
          effect: (p.effect as "Allow" | "Deny") ?? "Allow",
        }));

        const isSystem = this.repository.authorization.isSystemRole(role.name);

        roleInfos.push({
          name: role.name,
          displayName: role.displayName,
          description: role.description,
          isSystem,
          permissions: mappedPermissions,
          memberCount: role.users?.length ?? 0,
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
