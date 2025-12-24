import type { Resolvers, Membership, DomainMember, Role } from "../generated/types.js";
import type { ServiceContext } from "../../../context/index.js";
import { ListRolesScript, GetMembersForDomainScript } from "../../../scripts/authorization/index.js";
import { PermissionEffect } from "../generated/types.js";
import type { RoleInfo } from "../../../scripts/authorization/dto/index.js";

/**
 * Map RoleInfo DTO to GraphQL Role
 */
function mapRole(role: RoleInfo): Role {
  return {
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
   * Resolves membership data for a specific domain (e.g., store UUID).
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
    members: async (parent, _args, ctx): Promise<DomainMember[]> => {
      const organizationId = ctx.organizationId;
      if (!organizationId) {
        return [];
      }

      // Domain is the store UUID - build domain path as [["store", storeId]]
      const domain = parent.domain;

      const result = await ctx.kernel.runScript(GetMembersForDomainScript, {
        organizationId,
        domain: [["store", domain]],
      });

      if (result.userErrors.length > 0) {
        console.error("[Membership.members] Error:", result.userErrors);
        return [];
      }

      return result.members.map((m) => ({
        user: { __typename: "User", id: m.userId } as any,
        role: m.role,
        grantedAt: m.grantedAt ?? null,
        grantedBy: m.grantedBy ? ({ __typename: "User", id: m.grantedBy } as any) : null,
      }));
    },
  },

  /**
   * DomainMember type resolver.
   */
  DomainMember: {
    user: (parent) => {
      // Return Federation reference
      const userId = (parent.user as any)?.id ?? parent.user;
      return { __typename: "User", id: userId } as any;
    },
    grantedBy: (parent) => {
      if (!parent.grantedBy) return null;
      const grantedById = (parent.grantedBy as any)?.id ?? parent.grantedBy;
      return { __typename: "User", id: grantedById } as any;
    },
  },
};
