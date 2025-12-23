import type { Resolvers } from "../../generated/types.js";
import { checkAuthorization } from "../../decorators/authorize.js";

export const projectMemberMutationResolvers: Partial<Resolvers> = {
  ProjectMutation: {
    projectMemberRoleChange: async (_parent, { input }, ctx) => {
      const authError = await checkAuthorization(ctx, "project.team", "write");
      if (authError) {
        return {
          member: null,
          userErrors: [authError],
        };
      }

      const result = await ctx.kernel.getServices().broker.call(
        "iam.changeRoleForDomain",
        {
          organizationId: ctx.project.organizationId,
          userId: input.userId,
          domain: [["project", ctx.project.id]],
          newRole: input.newRole,
          grantedBy: ctx.user?.id,
        }
      );

      if (!result || result.userErrors?.length > 0) {
        return {
          member: null,
          userErrors: result?.userErrors ?? [
            { message: "Failed to change member role", code: "IAM_ERROR", field: null },
          ],
        };
      }

      return {
        member: {
          id: input.userId,
          user: { __typename: "User", id: input.userId },
          role: { __typename: "Role", name: input.newRole },
          grantedAt: result.grantedAt ?? null,
          grantedBy: ctx.user?.id ? { __typename: "User", id: ctx.user.id } : null,
        },
        userErrors: [],
      };
    },

    projectMemberRemove: async (_parent, { input }, ctx) => {
      const authError = await checkAuthorization(ctx, "project.team", "remove");
      if (authError) {
        return {
          removedUserId: null,
          userErrors: [authError],
        };
      }

      const result = await ctx.kernel.getServices().broker.call(
        "iam.removeMemberFromDomain",
        {
          organizationId: ctx.project.organizationId,
          userId: input.userId,
          domain: [["project", ctx.project.id]],
        }
      );

      if (!result || result.userErrors?.length > 0) {
        return {
          removedUserId: null,
          userErrors: result?.userErrors ?? [
            { message: "Failed to remove member", code: "IAM_ERROR", field: null },
          ],
        };
      }

      return {
        removedUserId: input.userId,
        userErrors: [],
      };
    },
  },
};
