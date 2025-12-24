import type { Resolvers } from "../../generated/types.js";
import { UserSignUpScript } from "../../../../scripts/user/UserSignUpScript.js";
import { UserSignInScript } from "../../../../scripts/user/UserSignInScript.js";
import { resolveUser } from "../types.js";

export const mutationResolvers: Partial<Resolvers> = {
  Mutation: {
    userMutation: () => ({} as any),
    authMutation: () => ({} as any),
    roleMutation: () => ({} as any),
  },

  UserMutation: {
    userUpdateProfile: async (_parent, { input: _input }, _ctx) => {
      // Update user's profile (firstName, lastName, avatar, locale)
      throw new Error("Not implemented");
    },

    userUpdateEmail: async (_parent, { input: _input }, _ctx) => {
      // Update user's email address with verification
      throw new Error("Not implemented");
    },

    userUpdatePassword: async (_parent, { input: _input }, _ctx) => {
      // Update user's password (requires current password)
      throw new Error("Not implemented");
    },
  },

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

  RoleMutation: {
    roleCreate: async (_parent, { input: _input }, _ctx) => {
      // Create a new role with permissions for the organization
      throw new Error("Not implemented");
    },

    roleUpdate: async (_parent, { input: _input }, _ctx) => {
      // Update an existing role's display name, description, or permissions
      throw new Error("Not implemented");
    },

    roleDelete: async (_parent, { input: _input }, _ctx) => {
      // Delete a custom role from the organization
      throw new Error("Not implemented");
    },
  },
};
