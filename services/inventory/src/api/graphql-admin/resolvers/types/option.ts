import type { Resolvers } from "../../generated/types.js";

export const optionTypeResolvers: Resolvers = {
  ProductOption: {
    values: async () => {
      throw new Error("Not implemented");
    },
  },

  ProductOptionValue: {
    swatch: async () => {
      throw new Error("Not implemented");
    },
  },

  ProductOptionSwatch: {
    file: async () => {
      throw new Error("Not implemented");
    },
  },
};
