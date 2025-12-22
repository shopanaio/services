import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  ListTenantMembersParams,
  ListTenantMembersResult,
  TenantMember,
} from "./dto/index.js";

/**
 * ListTenantMembers - List all users with roles in a tenant
 *
 * TENANT ISOLATION:
 * Uses tenantId (project slug) to list members.
 * Returns all users who have been assigned a role in the tenant.
 */
export class ListTenantMembersScript extends BaseScript<
  ListTenantMembersParams,
  ListTenantMembersResult
> {
  protected async execute(
    params: ListTenantMembersParams
  ): Promise<ListTenantMembersResult> {
    const { tenantId } = params;

    try {
      const members = await this.repository.authorization.getTenantMembers(
        tenantId
      );

      const tenantMembers: TenantMember[] = members.map((m) => ({
        userId: m.userId,
        userName: m.userId, // Will be enriched by resolver if needed
        email: "", // Will be enriched by resolver if needed
        role: m.roleName,
      }));

      return {
        members: tenantMembers,
        userErrors: [],
      };
    } catch (error) {
      this.logger.error(
        { error, params },
        "ListTenantMembersScript: Failed to list tenant members"
      );

      return {
        members: [],
        userErrors: [
          {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred while listing members",
          },
        ],
      };
    }
  }

  protected handleError(_error: unknown): ListTenantMembersResult {
    return {
      members: [],
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred while listing members",
        },
      ],
    };
  }
}
