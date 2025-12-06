import type { Resolvers } from "../../generated/types.js";

export const featureMutationResolvers: Resolvers = {
  InventoryMutation: {
    productFeatureCreate: async () => {
      throw new Error("Not implemented");
    },

    productFeatureUpdate: async () => {
      throw new Error("Not implemented");
    },

    productFeatureDelete: async () => {
      throw new Error("Not implemented");
    },
  },
};
