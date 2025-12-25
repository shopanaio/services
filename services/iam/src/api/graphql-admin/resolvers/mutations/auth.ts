import type { Resolvers } from "../../generated/types.js";
import { UserSignUpScript } from "../../../../scripts/user/UserSignUpScript.js";
import { UserSignInScript } from "../../../../scripts/user/UserSignInScript.js";
import { resolveUser } from "../types.js";

export const authMutationResolvers: Partial<Resolvers> = {
  AuthMutation: {
    signUp: async (_parent, { input }, ctx, info) => {
      const result = await ctx.kernel.runScript(UserSignUpScript, {
        email: input.email,
        password: input.password,
      });

      return {
        user: result.user ? await resolveUser(result.user.id, ctx, info, "user") : null,
        token: result.token,
        userErrors: result.userErrors.map((e) => ({
          code: e.code,
          message: e.message,
          field: e.field ?? null,
        })),
      };
    },

    signIn: async (_parent, { input }, ctx, info) => {
      const result = await ctx.kernel.runScript(UserSignInScript, {
        email: input.email,
        password: input.password,
      });

      return {
        user: result.user ? await resolveUser(result.user.id, ctx, info, "user") : null,
        token: result.token,
        userErrors: result.userErrors.map((e) => ({
          code: e.code,
          message: e.message,
          field: e.field ?? null,
        })),
      };
    },

    signOut: async (_parent, { input: _input }, _ctx) => {
      // Invalidate user's session/refresh token
      throw new Error("Not implemented");
    },

    tokenRefresh: async (_parent, { input: _input }, _ctx) => {
      // Refresh access token using refresh token
      throw new Error("Not implemented");
    },
  },
};
