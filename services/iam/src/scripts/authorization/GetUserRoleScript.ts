import { BaseScript } from "../../kernel/BaseScript.js";
import type { GetUserRoleParams, GetUserRoleResult } from "./dto/index.js";

/**
 * GetUserRole - Get user's role in a tenant
 *
 * TENANT ISOLATION:
 * Uses tenantId (project slug) for role lookup.
 *
 * Implementation:
 * 1. Use tenantId directly (passed from caller)
 * 2. Get user's roles from Casbin via CasbinService
 * 3. Return the first role (users typically have one role per tenant)
 */
export class GetUserRoleScript extends BaseScript<
  GetUserRoleParams,
  GetUserRoleResult
> {
  protected async execute(params: GetUserRoleParams): Promise<GetUserRoleResult> {
    const { userId, tenantId } = params;

    try {
      const roles = await this.repository.authorization.getUserRoles(
        tenantId,
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
