import type { Resolvers } from "../../generated/types.js";
import { dummyProducts, dummyVariants, type DummyVariant } from "../dummy.js";

export const variantTypeResolvers: Resolvers = {
  Variant: {
    __resolveReference: async (reference) => {
      return dummyVariants.get(reference.id) ?? null;
    },

    product: async (parent) => {
      const productId = (parent as DummyVariant).productId;
      return dummyProducts.get(productId) ?? null;
    },

    price: async () => {
      return null;
    },

    priceHistory: async () => {
      return {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
        totalCount: 0,
      };
    },

    cost: async () => {
      return null;
    },

    costHistory: async () => {
      return {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
        totalCount: 0,
      };
    },

    selectedOptions: async () => {
      return [];
    },

    stock: async () => {
      return [];
    },

    inStock: async () => {
      return false;
    },

    media: async () => {
      return [];
    },
  },
};
