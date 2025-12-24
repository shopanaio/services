import type { Resolvers } from "../generated/types.js";

export const queryResolvers: Partial<Resolvers> = {
  Query: {
    userQuery: () => ({} as any),
  },

  UserQuery: {
    current: async (_parent, _args, _ctx) => {
      // Return current authenticated user from context
      throw new Error("Not implemented");
    },
  },

  User: {
    __resolveReference: async (_reference, _ctx) => {
      // Federation resolver: fetch user by ID from database
      throw new Error("Not implemented");
    },
  },
};
