import type { Resolvers } from "../../generated/types.js";
import { OrganizationCreateScript } from "../../../../scripts/organization/OrganizationCreateScript.js";
import { MemberInviteScript } from "../../../../scripts/organization/MemberInviteScript.js";
import { resolveOrganization, resolveMember } from "../types.js";

export const organizationMutationResolvers: Partial<Resolvers> = {
  OrganizationMutation: {
    organizationCreate: async (_parent, { input }, ctx, info) => {
      const result = await ctx.kernel.runScript(
        OrganizationCreateScript,
        input
      );

      return {
        organization: result.organization
          ? await resolveOrganization(
              result.organization.id,
              ctx,
              info,
              "organization"
            )
          : null,
        userErrors: result.userErrors.map((e) => ({
          code: e.code ?? "UNKNOWN_ERROR",
          message: e.message,
          field: e.field ? [e.field] : null,
        })),
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

    memberInvite: async (_parent, { input }, ctx, info) => {
      const result = await ctx.kernel.runScript(MemberInviteScript, input);

      return {
        member: result.member
          ? await resolveMember(
              {
                userId: result.member.userId,
                role: result.member.role,
                domain: result.member.domain,
                organizationId: result.member.organizationId,
              },
              ctx,
              info,
              "member"
            )
          : null,
        userErrors: result.userErrors.map((e) => ({
          code: e.code ?? "UNKNOWN_ERROR",
          message: e.message,
          field: e.field ? [e.field] : null,
        })),
      };
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
