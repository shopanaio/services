import type { Resolvers } from "../generated/types.js";
import { dummyProducts, dummyVariants } from "./dummy.js";

export const queryResolvers: Resolvers = {
  Query: {
    inventoryQuery: () => ({}),
  },

  InventoryQuery: {
    node: async (_parent, { id }) => {
      const product = dummyProducts.get(id);
      if (product) return product;

      const variant = dummyVariants.get(id);
      if (variant) return variant;

      return null;
    },

    nodes: async (_parent, { ids }) => {
      return ids.map((id) => {
        const product = dummyProducts.get(id);
        if (product) return product;
        const variant = dummyVariants.get(id);
        if (variant) return variant;
        return null;
      });
    },

    product: async (_parent, { id }) => {
      return dummyProducts.get(id) ?? null;
    },

    products: async (_parent, args) => {
      const products = Array.from(dummyProducts.values()).filter(
        (p) => !p.deletedAt
      );
      const first = args.first ?? 10;
      const edges = products.slice(0, first).map((product) => ({
        node: product,
        cursor: Buffer.from(product.id).toString("base64"),
      }));
      return {
        edges,
        pageInfo: {
          hasNextPage: products.length > first,
          hasPreviousPage: false,
          startCursor: edges[0]?.cursor ?? null,
          endCursor: edges[edges.length - 1]?.cursor ?? null,
        },
        totalCount: products.length,
      };
    },

    variant: async (_parent, { id }) => {
      return dummyVariants.get(id) ?? null;
    },

    variants: async (_parent, args) => {
      const variants = Array.from(dummyVariants.values());
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

    warehouse: async () => {
      throw new Error("Not implemented");
    },

    warehouses: async () => {
      throw new Error("Not implemented");
    },
  },
};
