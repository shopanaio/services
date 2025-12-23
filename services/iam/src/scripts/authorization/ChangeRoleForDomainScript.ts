import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  ChangeRoleForDomainParams,
  ChangeRoleForDomainResult,
} from "./dto/index.js";

/**
 * ChangeRoleForDomain - Change a user's role in a specific domain (e.g., project)
 */
export class ChangeRoleForDomainScript extends BaseScript<
  ChangeRoleForDomainParams,
  ChangeRoleForDomainResult
> {
  protected async execute(
    params: ChangeRoleForDomainParams
  ): Promise<ChangeRoleForDomainResult> {
    const { organizationId, userId, domain, newRole, grantedBy } = params;

    if (!organizationId) {
      return {
        success: false,
        userErrors: [
          { code: "NO_ORG_CONTEXT", message: "organizationId is required" },
        ],
      };
    }

    if (!domain || domain.length === 0) {
      return {
        success: false,
        userErrors: [{ code: "NO_DOMAIN", message: "domain is required" }],
      };
    }

    try {
      const result = await this.repository.authorization.attachUserRoleForDomain(
        organizationId,
        userId,
        newRole,
        domain,
        grantedBy
      );

      if (!result.success) {
        return {
          success: false,
          userErrors: [
            {
              code: "ROLE_NOT_FOUND",
              message: `Role ${newRole} not found in organization`,
            },
          ],
        };
      }

      // Invalidate cache for this user
      this.authCache.onUserRoleChange(organizationId, userId);

      const domainPath = this.repository.casbin.buildPath(domain);
      this.logger.info(
        { userId, organizationId, domain: domainPath, newRole },
        "ChangeRoleForDomainScript: Role changed successfully"
      );

      return {
        success: true,
        grantedAt: result.grantedAt,
        userErrors: [],
      };
    } catch (error) {
      this.logger.error(
        { error, params },
        "ChangeRoleForDomainScript: Failed to change role"
      );

      return {
        success: false,
        userErrors: [
          {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred while changing role",
          },
        ],
      };
    }
  }

  protected handleError(_error: unknown): ChangeRoleForDomainResult {
    return {
      success: false,
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred while changing role",
        },
      ],
    };
  }
}
