import type { Resolvers, Organization } from "../../generated/types.js";
import { OrganizationCreateScript } from "../../../../scripts/organization/OrganizationCreateScript.js";
import { createDomain } from "../../../../casbin/CasbinService.js";

export const organizationMutationResolvers: Partial<Resolvers> = {
  OrganizationMutation: {
    organizationCreate: async (_parent, { input }, ctx) => {
      const result = await ctx.kernel.runScript(OrganizationCreateScript, input);

      if (!result.organization) {
        return {
          organization: null,
          userErrors: result.userErrors.map((e) => ({
            code: e.code ?? "UNKNOWN_ERROR",
            message: e.message,
            field: e.field ?? null,
          })),
        };
      }

      const org = result.organization;
      const organization: Organization = {
        __typename: "Organization",
        id: org.id,
        name: org.name,
        slug: org.slug,
        createdAt: org.createdAt.toISOString(),
        updatedAt: org.updatedAt?.toISOString() ?? null,
        membership: {
          __typename: "Membership",
          domain: createDomain("org", org.id),
          members: [],
          roles: [],
        },
      };

      return {
        organization,
        userErrors: [],
      };
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

    memberRoleChange: async (_parent, { input: _input }, _ctx) => {
      throw new Error("Not implemented");
    },

    memberAccessRemove: async (_parent, { input: _input }, _ctx) => {
      throw new Error("Not implemented");
    },
  },
};
