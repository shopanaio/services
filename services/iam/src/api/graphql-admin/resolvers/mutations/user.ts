import type { Resolvers } from "../../generated/types.js";
import { UserSignUpScript, UserSignInScript, TokenRefreshScript } from "../../../../scripts/user/index.js";
import { resolveUser } from "../types.js";

export const userMutationResolvers: Partial<Resolvers> = {
  Mutation: {
    userMutation: () => ({} as any),
    authMutation: () => ({} as any),
  },

  UserMutation: {
    userUpdateProfile: async (_parent, { input: _input }, _ctx) => {
      // TODO: implement
      return {
        user: null,
        userErrors: [
          {
            code: "NOT_IMPLEMENTED",
            message: "userUpdateProfile is not implemented yet",
          },
        ],
      };
    },

    userUpdateEmail: async (_parent, { input: _input }, _ctx) => {
      // TODO: implement
      return {
        user: null,
        userErrors: [
          {
            code: "NOT_IMPLEMENTED",
            message: "userUpdateEmail is not implemented yet",
          },
        ],
      };
    },

    userUpdatePassword: async (_parent, { input: _input }, _ctx) => {
      // TODO: implement
      return {
        success: false,
        userErrors: [
          {
            code: "NOT_IMPLEMENTED",
            message: "userUpdatePassword is not implemented yet",
          },
        ],
      };
    },
  },

  AuthMutation: {
    signUp: async (_parent, { input }, ctx, info) => {
      const result = await ctx.kernel.runScript(UserSignUpScript, {
        email: input.email,
        password: input.password,
      });

      return {
        user: result.user
          ? await resolveUser(result.user.id!, ctx, info, "user")
          : null,
        token: result.token,
        userErrors: result.userErrors,
      };
    },

    signIn: async (_parent, { input }, ctx, info) => {
      const result = await ctx.kernel.runScript(UserSignInScript, {
        email: input.email,
        password: input.password,
      });

      return {
        user: result.user
          ? await resolveUser(result.user.id!, ctx, info, "user")
          : null,
        token: result.token,
        userErrors: result.userErrors,
      };
    },

    signOut: async (_parent, { input: _input }, _ctx) => {
      // TODO: implement
      return {
        success: false,
        userErrors: [
          {
            code: "NOT_IMPLEMENTED",
            message: "signOut is not implemented yet",
          },
        ],
      };
    },

    tokenRefresh: async (_parent, { input }, ctx) => {
      const result = await ctx.kernel.runScript(TokenRefreshScript, {
        refreshToken: input.refreshToken,
      });

      return {
        token: result.token,
        userErrors: result.userErrors,
      };
    },
  },
};
