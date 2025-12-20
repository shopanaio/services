import type { ServiceContext } from "../../../context/index.js";

export const queryResolvers = {
  Query: {
    userQuery: () => ({}),
  },

  UserQuery: {
    current: async (_parent: unknown, _args: unknown, ctx: ServiceContext) => {
      return ctx.currentUser;
    },
  },
};
