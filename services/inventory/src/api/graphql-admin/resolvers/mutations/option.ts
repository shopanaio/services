import type { Resolvers } from "../../generated/types.js";

export const optionMutationResolvers: Resolvers = {
  InventoryMutation: {
    productOptionCreate: async () => {
      throw new Error("Not implemented");
    },

    productOptionUpdate: async () => {
      throw new Error("Not implemented");
    },

    productOptionDelete: async () => {
      throw new Error("Not implemented");
    },
  },
};
