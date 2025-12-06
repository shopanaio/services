import type { Resolvers } from "../../generated/types.js";

export const featureTypeResolvers: Resolvers = {
  ProductFeature: {
    values: async () => {
      throw new Error("Not implemented");
    },
  },
};
