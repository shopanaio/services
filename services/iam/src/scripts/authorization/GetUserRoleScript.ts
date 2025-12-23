import { BaseScript } from "../../kernel/BaseScript.js";
import type { GetUserRoleParams, GetUserRoleResult } from "./dto/index.js";
import type { ScopePart } from "../../casbin/CasbinService.js";

/**
 * GetUserRole - Get user's role in an organization/project
 *
 * ORGANIZATION + DOMAIN ISOLATION:
 * Uses organizationId and optional projectId for role lookup.
 *
 * Implementation:
 * 1. Get organizationId (required) and projectId (optional domain)
 * 2. Get user's roles from Casbin via CasbinService
 * 3. Return the first role in the specified domain, or all roles
 */
export class GetUserRoleScript extends BaseScript<
  GetUserRoleParams,
  GetUserRoleResult
> {
  protected async execute(params: GetUserRoleParams): Promise<GetUserRoleResult> {
    const { userId, projectId } = params;

    // Support both new organizationId and legacy tenantId
    const organizationId = params.organizationId || params.tenantId;

    if (!organizationId) {
      return {
        role: null,
        permissions: [],
        userErrors: [{ code: "NO_ORG_CONTEXT", message: "organizationId is required" }],
      };
    }

    try {
      // Build domain scope
      const domain: ScopePart[] = projectId ? [["project", projectId]] : [];

      // Get roles in specific domain
      const rolesInDomain = await this.repository.casbin.getRolesForUserInDomain(
        organizationId,
        userId,
        domain
      );

      // Also get all roles across all domains
      const allRoles = await this.repository.casbin.getRolesForUser(
        organizationId,
        userId
      );

      if (rolesInDomain.length === 0 && allRoles.length === 0) {
        return {
          role: null,
          roles: [],
          permissions: [],
          userErrors: [],
        };
      }

      // Return the first role in the domain (primary role for this project)
      const roleName = rolesInDomain.length > 0 ? rolesInDomain[0] : allRoles[0]?.role ?? null;

      return {
        role: roleName,
        roles: allRoles,
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
