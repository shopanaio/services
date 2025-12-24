import type { Resolvers, Membership, Member, Role } from "../generated/types.js";
import type { ServiceContext } from "../../../context/index.js";
import { ListRolesScript } from "../../../scripts/authorization/index.js";
import { PermissionEffect } from "../generated/types.js";
import type { RoleInfo } from "../../../scripts/authorization/dto/index.js";

/**
 * Map RoleInfo DTO to GraphQL Role
 */
function mapRole(role: RoleInfo): Role {
  return {
    id: role.id ?? role.name, // Use name as fallback for system roles
    name: role.name,
    displayName: role.displayName,
    description: role.description,
    isSystem: role.isSystem,
    permissions: role.permissions.map((p) => ({
      resource: p.resource,
      actions: p.actions,
      effect: p.effect === "Allow" ? PermissionEffect.Allow : PermissionEffect.Deny,
    })),
    createdAt: role.createdAt?.toISOString(),
  };
}

export const membershipResolvers: Partial<Resolvers> = {
  /**
   * Membership type resolver for Federation.
   * Resolves membership data for a specific domain (orgId or storeId).
   */
  Membership: {
    __resolveReference: async (
      reference: { domain: string },
      ctx: ServiceContext
    ): Promise<Membership | null> => {
      const organizationId = ctx.organizationId;
      if (!organizationId) {
        console.warn("[Membership.__resolveReference] No organizationId in context");
        return null;
      }

      // Return base membership object - fields will be resolved by field resolvers
      return {
        domain: reference.domain,
        roles: [],
        members: [],
        availableResources: null,
      };
    },

    /**
     * Resolve roles for this domain's organization.
     */
    roles: async (parent, _args, ctx): Promise<Role[]> => {
      const organizationId = ctx.organizationId;
      if (!organizationId) {
        return [];
      }

      const result = await ctx.kernel.runScript(ListRolesScript, {
        organizationId,
      });

      if (result.userErrors.length > 0) {
        console.error("[Membership.roles] Error:", result.userErrors);
        return [];
      }

      return result.roles.map(mapRole);
    },

    /**
     * Resolve members with access to this domain.
     */
    members: async (parent, _args, ctx): Promise<Member[]> => {
      const organizationId = ctx.organizationId;
      if (!organizationId) {
        return [];
      }

      const domain = parent.domain;
      const casbin = ctx.kernel.repository.casbin;

      // Get members for this domain using simplified API
      const casbinMembers = await casbin.getMembersForDomainSimple(organizationId, domain);

      // Get organization members to map userId to member records
      const orgMembers = await ctx.kernel.repository.organization.getMembersForOrg(organizationId);
      const memberMap = new Map(orgMembers.map(m => [m.userId, m]));

      const members: Member[] = [];

      for (const cm of casbinMembers) {
        const orgMember = memberMap.get(cm.userId);
        if (orgMember) {
          members.push({
            id: orgMember.id,
            user: { __typename: "User", id: cm.userId } as any,
            role: cm.role,
            grantedAt: orgMember.createdAt.toISOString(),
            grantedBy: orgMember.invitedBy
              ? ({ __typename: "User", id: orgMember.invitedBy } as any)
              : null,
          });
        }
      }

      return members;
    },

    /**
     * Resolve available resources for role editor (org-level only).
     */
    availableResources: async (
      parent: Membership,
      _args: Record<string, never>,
      ctx: ServiceContext
    ) => {
      const organizationId = ctx.organizationId;
      if (!organizationId) {
        return null;
      }

      // Only return resources for org-level membership (domain === organizationId)
      if (parent.domain !== organizationId) {
        return null;
      }

      return ctx.kernel.repository.resource.getAllResources();
    },
  },
};
