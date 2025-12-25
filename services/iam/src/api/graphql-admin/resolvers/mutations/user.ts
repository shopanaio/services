import type { Resolvers } from "../../generated/types.js";

export const userMutationResolvers: Partial<Resolvers> = {
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
};
