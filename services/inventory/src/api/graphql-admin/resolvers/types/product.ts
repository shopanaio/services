import type { Resolvers } from "../../generated/types.js";
import { dummyProducts, dummyVariants, type DummyProduct } from "../dummy.js";

export const productTypeResolvers: Resolvers = {
  Product: {
    __resolveReference: async (reference) => {
      return dummyProducts.get(reference.id) ?? null;
    },

    variants: async (parent, args) => {
      const productId = (parent as DummyProduct).id;
      const variants = Array.from(dummyVariants.values()).filter(
        (v) => v.productId === productId
      );
      const first = args.first ?? 10;
      const edges = variants.slice(0, first).map((variant) => ({
        node: variant,
        cursor: Buffer.from(variant.id).toString("base64"),
      }));
      return {
        edges,
        pageInfo: {
          hasNextPage: variants.length > first,
          hasPreviousPage: false,
          startCursor: edges[0]?.cursor ?? null,
          endCursor: edges[edges.length - 1]?.cursor ?? null,
        },
        totalCount: variants.length,
      };
    },

    options: async () => {
      return [];
    },

    features: async () => {
      return [];
    },

    variantsCount: async (parent) => {
      const productId = (parent as DummyProduct).id;
      return Array.from(dummyVariants.values()).filter(
        (v) => v.productId === productId
      ).length;
    },
  },
};
