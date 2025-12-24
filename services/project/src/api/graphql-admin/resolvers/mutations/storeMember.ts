import type { Resolvers } from "../../generated/types.js";
import { checkAuthorization } from "../../decorators/authorize.js";

export const storeMemberMutationResolvers: Partial<Resolvers> = {
  StoreMutation: {
    storeMemberRoleChange: async (_parent, { input }, ctx) => {
      const authError = await checkAuthorization(ctx, "store.team", "write");
      if (authError) {
        return {
          member: null,
          userErrors: [authError],
        };
      }

      const result = await ctx.kernel.getServices().broker.call(
        "iam.changeRoleForDomain",
        {
          organizationId: ctx.store.organizationId,
          userId: input.userId,
          domain: [["store", ctx.store.id]],
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

    storeMemberRemove: async (_parent, { input }, ctx) => {
      const authError = await checkAuthorization(ctx, "store.team", "remove");
      if (authError) {
        return {
          removedUserId: null,
          userErrors: [authError],
        };
      }

      const result = await ctx.kernel.getServices().broker.call(
        "iam.removeMemberFromDomain",
        {
          organizationId: ctx.store.organizationId,
          userId: input.userId,
          domain: [["store", ctx.store.id]],
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
