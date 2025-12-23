import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  GetMembersForDomainParams,
  GetMembersForDomainResult,
} from "./dto/index.js";

/**
 * GetMembersForDomain - Get members with access to a specific domain (e.g., project)
 *
 * Returns all users who have a role assignment for the specified domain,
 * including users with domain="*" (access to all domains).
 */
export class GetMembersForDomainScript extends BaseScript<
  GetMembersForDomainParams,
  GetMembersForDomainResult
> {
  protected async execute(
    params: GetMembersForDomainParams
  ): Promise<GetMembersForDomainResult> {
    const { organizationId, domain } = params;

    if (!organizationId) {
      return {
        members: [],
        userErrors: [
          { code: "NO_ORG_CONTEXT", message: "organizationId is required" },
        ],
      };
    }

    if (!domain) {
      return {
        members: [],
        userErrors: [{ code: "NO_DOMAIN", message: "domain is required" }],
      };
    }

    try {
      const domainPath = this.repository.casbin.buildPath(domain);
      const members = await this.repository.authorization.getMembersForDomain(
        organizationId,
        domainPath
      );

      return {
        members: members.map((m) => ({
          userId: m.userId,
          role: m.roleName,
          grantedAt: m.grantedAt,
          grantedBy: m.grantedBy ?? undefined,
        })),
        userErrors: [],
      };
    } catch (error) {
      this.logger.error(
        { error, params },
        "GetMembersForDomainScript: Failed to get members"
      );

      return {
        members: [],
        userErrors: [
          {
            code: "FETCH_FAILED",
            message: "Failed to fetch members for domain",
          },
        ],
      };
    }
  }

  protected handleError(_error: unknown): GetMembersForDomainResult {
    return {
      members: [],
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred while fetching members",
        },
      ],
    };
  }
}
