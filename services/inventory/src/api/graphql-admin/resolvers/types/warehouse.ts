import type { Resolvers } from "../../generated/types.js";

export const warehouseTypeResolvers: Resolvers = {
  Warehouse: {
    stock: async () => {
      throw new Error("Not implemented");
    },

    variantsCount: async () => {
      throw new Error("Not implemented");
    },
  },

  WarehouseStock: {
    warehouse: async () => {
      throw new Error("Not implemented");
    },

    variant: async () => {
      throw new Error("Not implemented");
    },
  },
};
