import type { ServiceContext } from "../../../context/index.js";

export const queries = {
  currentUser: async (_parent: any, _args: any, ctx: ServiceContext) => {
    return ctx.currentUser ?? null;
  },
};
