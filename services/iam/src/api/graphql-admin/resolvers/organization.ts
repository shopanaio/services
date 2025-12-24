import type { Resolvers } from "../generated/types.js";
import type { ScopePart } from "../../../casbin/CasbinService.js";

/**
 * Parse domain string into ScopePart array
 * e.g., "store:uuid" -> [["store", "uuid"]]
 * e.g., "org:*" -> [["org"]]
 */
function parseDomain(domain: string): ScopePart[] {
  const [type, id] = domain.split(":");
  if (!type) return [];
  if (!id || id === "*") return [[type]];
  return [[type, id]];
}

export const organizationResolvers: Partial<Resolvers> = {
  Query: {
    organizationQuery: () => ({}) as any,
  },

  OrganizationQuery: {
    organization: async (_parent, { id: _id }, _ctx) => {
      // Get organization by ID
      throw new Error("Not implemented");
    },
  },

  Mutation: {
    organizationMutation: () => ({}) as any,
  },

  OrganizationMutation: {
    organizationCreate: async (_parent, { input: _input }, _ctx) => {
      // Create a new organization, add current user as owner
      throw new Error("Not implemented");
    },

    organizationUpdate: async (_parent, { input: _input }, _ctx) => {
      // Update organization name
      throw new Error("Not implemented");
    },

    organizationDelete: async (_parent, _args, _ctx) => {
      // Soft delete organization
      throw new Error("Not implemented");
    },

    memberInvite: async (_parent, { input: _input }, _ctx) => {
      // Invite user to organization by email with role assignments
      throw new Error("Not implemented");
    },

    memberRemove: async (_parent, { memberId: _memberId }, _ctx) => {
      // Remove member from organization and revoke all roles
      throw new Error("Not implemented");
    },

    memberRoleChange: async (_parent, { input }, ctx) => {
      // Check authentication
      if (!ctx.currentUser || !ctx.organizationId) {
        return {
          member: null,
          userErrors: [{ code: "UNAUTHENTICATED", message: "Authentication required", field: null }],
        };
      }

      const { userId, domain, role } = input;
      const domainParts = parseDomain(domain);

      if (domainParts.length === 0) {
        return {
          member: null,
          userErrors: [{ code: "INVALID_DOMAIN", message: "Invalid domain format", field: ["domain"] }],
        };
      }

      try {
        // First remove existing roles in this domain
        await ctx.kernel.repository.casbin.removeAllRolesInDomain({
          organizationId: ctx.organizationId,
          userId,
          domain: domainParts,
        });

        // Assign new role
        await ctx.kernel.repository.casbin.assignRole({
          organizationId: ctx.organizationId,
          userId,
          role,
          domain: domainParts,
        });

        // Return member info (minimal - Federation will resolve User)
        return {
          member: {
            id: `${userId}:${domain}`,
            user: { __typename: "User", id: userId },
            role,
            grantedAt: new Date(),
            grantedBy: { __typename: "User", id: ctx.currentUser.id },
          } as any,
          userErrors: [],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to change role";
        return {
          member: null,
          userErrors: [{ code: "ROLE_CHANGE_FAILED", message, field: null }],
        };
      }
    },

    memberAccessRemove: async (_parent, { input }, ctx) => {
      // Check authentication
      if (!ctx.currentUser || !ctx.organizationId) {
        return {
          success: false,
          userErrors: [{ code: "UNAUTHENTICATED", message: "Authentication required", field: null }],
        };
      }

      const { userId, domain } = input;
      const domainParts = parseDomain(domain);

      if (domainParts.length === 0) {
        return {
          success: false,
          userErrors: [{ code: "INVALID_DOMAIN", message: "Invalid domain format", field: ["domain"] }],
        };
      }

      try {
        await ctx.kernel.repository.casbin.removeAllRolesInDomain({
          organizationId: ctx.organizationId,
          userId,
          domain: domainParts,
        });

        return {
          success: true,
          userErrors: [],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to remove access";
        return {
          success: false,
          userErrors: [{ code: "ACCESS_REMOVE_FAILED", message, field: null }],
        };
      }
    },
  },

  Organization: {
    membership: (_parent) => {
      // Return Federation reference for membership (domain = orgId)
      throw new Error("Not implemented");
    },
  },

  Member: {
    __resolveReference: async (_reference, _ctx) => {
      // Resolve Member by id for Federation
      throw new Error("Not implemented");
    },

    user: (_parent) => {
      // Resolve user reference for Federation
      throw new Error("Not implemented");
    },

    grantedBy: (_parent) => {
      // Resolve grantedBy user reference for Federation
      throw new Error("Not implemented");
    },
  },
};
