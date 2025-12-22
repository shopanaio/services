import { ServiceContext } from "@src/context/types.js";
import type { Resolvers } from "../generated/types.js";

export const queryResolvers = {
  Query: {
    userQuery: () => ({} as any),
  },

  UserQuery: {
    current: async (_parent: unknown, _args: unknown, ctx: ServiceContext) => {
      // Return current user - type cast needed until codegen is updated
      return ctx.currentUser as any;
    },
  },
} satisfies Partial<Resolvers>;
