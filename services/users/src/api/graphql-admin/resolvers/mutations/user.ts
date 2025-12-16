import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { Resolvers, User } from "../../generated/types.js";
import {
  UserCreateScript,
  UserUpdateScript,
  UserDeleteScript,
} from "../../../../scripts/user/index.js";
import { UserResolver } from "../../../../resolvers/admin/UserResolver.js";
import { noDatabaseError, requireContext } from "../utils.js";

export const userMutationResolvers: Resolvers = {
  UsersMutation: {
    userCreate: async (_parent, { input }, ctx, info) => {
      if (!ctx.kernel) {
        return noDatabaseError({ user: null });
      }

      const result = await ctx.kernel.runScript(UserCreateScript, {
        email: input.email,
      });

      const userFieldInfo = parseGraphqlInfo(info, "user");

      return {
        user: result.user
          ? ((await UserResolver.load(
              result.user.id,
              userFieldInfo,
              requireContext(ctx)
            )) as User)
          : null,
        userErrors: result.userErrors,
      };
    },

    userUpdate: async (_parent, { input }, ctx, info) => {
      if (!ctx.kernel) {
        return noDatabaseError({ user: null });
      }

      const result = await ctx.kernel.runScript(UserUpdateScript, {
        id: input.id,
        email: input.email ?? undefined,
      });

      const userFieldInfo = parseGraphqlInfo(info, "user");

      return {
        user: result.user
          ? ((await UserResolver.load(
              result.user.id,
              userFieldInfo,
              requireContext(ctx)
            )) as User)
          : null,
        userErrors: result.userErrors,
      };
    },

    userDelete: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ deletedUserId: null });
      }

      const result = await ctx.kernel.runScript(UserDeleteScript, {
        id: input.id,
        permanent: input.permanent ?? undefined,
      });

      return {
        deletedUserId: result.deletedUserId ?? null,
        userErrors: result.userErrors,
      };
    },
  },
};
