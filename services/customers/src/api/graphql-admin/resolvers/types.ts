import type { Resolvers } from "../generated/types.js";

export const typeResolvers: Partial<Resolvers> = {
  Node: {
    __resolveType(obj: any) {
      // Check for Customer type
      if (obj.email !== undefined) {
        return "Customer";
      }
      return null;
    },
  },
};
