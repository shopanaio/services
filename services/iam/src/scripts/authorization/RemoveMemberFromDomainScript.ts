import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  RemoveMemberFromDomainParams,
  RemoveMemberFromDomainResult,
} from "./dto/index.js";

/**
 * RemoveMemberFromDomain - Remove a user from a specific domain (e.g., project)
 */
export class RemoveMemberFromDomainScript extends BaseScript<
  RemoveMemberFromDomainParams,
  RemoveMemberFromDomainResult
> {
  protected async execute(
    params: RemoveMemberFromDomainParams
  ): Promise<RemoveMemberFromDomainResult> {
    const { organizationId, userId, domain } = params;

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
      const removed = await this.repository.authorization.detachUserRoleFromDomain(
        organizationId,
        userId,
        domain
      );

      if (!removed) {
        return {
          success: false,
          userErrors: [
            {
              code: "MEMBER_NOT_FOUND",
              message: `User ${userId} is not a member of this domain`,
            },
          ],
        };
      }

      // Invalidate cache for this user
      this.authCache.onUserRoleChange(organizationId, userId);

      const domainPath = this.repository.casbin.buildPath(domain);
      this.logger.info(
        { userId, organizationId, domain: domainPath },
        "RemoveMemberFromDomainScript: Member removed successfully"
      );

      return {
        success: true,
        userErrors: [],
      };
    } catch (error) {
      this.logger.error(
        { error, params },
        "RemoveMemberFromDomainScript: Failed to remove member"
      );

      return {
        success: false,
        userErrors: [
          {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred while removing member",
          },
        ],
      };
    }
  }

  protected handleError(_error: unknown): RemoveMemberFromDomainResult {
    return {
      success: false,
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred while removing member",
        },
      ],
    };
  }
}
