import type { UserMutationResolvers } from "../../generated/types.js";
import { UserSignUpScript, UserSignInScript } from "../../../../scripts/user/index.js";

export const userMutationResolvers = {
  Mutation: {
    userMutation: () => ({}),
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

    signUp: async (_parent, { input }, ctx) => {
      const result = await ctx.kernel.runScript(UserSignUpScript, {
        email: input.email,
        password: input.password,
      });

      return {
        user: result.user,
        token: result.token,
        userErrors: result.userErrors,
      };
    },

    signIn: async (_parent, { input }, ctx) => {
      const result = await ctx.kernel.runScript(UserSignInScript, {
        email: input.email,
        password: input.password,
      });

      return {
        user: result.user,
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

    tokenRefresh: async (_parent, { input: _input }, _ctx) => {
      // TODO: implement
      return {
        token: null,
        userErrors: [
          {
            code: "NOT_IMPLEMENTED",
            message: "tokenRefresh is not implemented yet",
          },
        ],
      };
    },
  } satisfies UserMutationResolvers,
};
