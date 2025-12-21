import { BaseScript } from "../../kernel/BaseScript.js";
import { getTenantOrg } from "../../constants/index.js";
import type { GetUserRoleParams, GetUserRoleResult } from "./dto/index.js";

/**
 * GetUserRole - Get user's role in a project
 *
 * TENANT ISOLATION:
 * Uses projectId to compute tenantOrg for role lookup.
 *
 * Implementation:
 * 1. Compute tenantOrg from projectId
 * 2. Call Casdoor to get user's roles for the tenant
 * 3. Return the first role (users typically have one role per project)
 */
export class GetUserRoleScript extends BaseScript<
  GetUserRoleParams,
  GetUserRoleResult
> {
  protected async execute(params: GetUserRoleParams): Promise<GetUserRoleResult> {
    const { userId, projectId } = params;

    // Compute tenant organization from projectId
    const tenantOrg = getTenantOrg(projectId);

    try {
      const roles = await this.repository.authorization.getUserRoles(
        tenantOrg,
        userId
      );

      if (roles.length === 0) {
        return {
          role: null,
          permissions: [],
          userErrors: [],
        };
      }

      // Return the first role (primary role)
      // Users typically have one role per project
      const roleName = roles[0];

      // TODO: Fetch permissions for this role
      // For now, return empty permissions array
      // This will be populated when we implement permission fetching

      return {
        role: roleName,
        permissions: [],
        userErrors: [],
      };
    } catch (error) {
      this.logger.error(
        { error, params },
        "GetUserRoleScript: Failed to get user role"
      );

      return {
        role: null,
        permissions: [],
        userErrors: [
          {
            code: "ROLE_FETCH_FAILED",
            message: "Failed to fetch user role",
          },
        ],
      };
    }
  }

  protected handleError(_error: unknown): GetUserRoleResult {
    return {
      role: null,
      permissions: [],
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred while fetching user role",
        },
      ],
    };
  }
}
