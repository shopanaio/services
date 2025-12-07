import type { Resolvers } from "../generated/types.js";
import { dummyVariants } from "./dummy.js";
import { requireKernel } from "./utils.js";

export const queryResolvers: Resolvers = {
  Query: {
    inventoryQuery: () => ({}),
  },

  InventoryQuery: {
    node: async (_parent, { id }, ctx) => {
      const kernel = requireKernel(ctx);
      const product = await kernel.services.repository.productQuery.getOne(id);
      if (product) return { ...product, __typename: "Product" as const };

      const variant = dummyVariants.get(id);
      if (variant) return variant;

      return null;
    },

    nodes: async (_parent, { ids }, ctx) => {
      const kernel = requireKernel(ctx);
      return Promise.all(
        ids.map(async (id) => {
          const product = await kernel.services.repository.productQuery.getOne(id);
          if (product) return { ...product, __typename: "Product" as const };

          const variant = dummyVariants.get(id);
          if (variant) return variant;

          return null;
        })
      );
    },

    product: async (_parent, { id }, ctx) => {
      const kernel = requireKernel(ctx);
      return kernel.services.repository.productQuery.getOne(id);
    },

    products: async (_parent, args, ctx) => {
      const kernel = requireKernel(ctx);
      const first = args.first ?? 10;

      const products = await kernel.services.repository.productQuery.getMany({
        limit: first + 1,
      });

      const hasNextPage = products.length > first;
      const resultProducts = hasNextPage ? products.slice(0, first) : products;

      const edges = resultProducts.map((product) => ({
        node: product,
        cursor: Buffer.from(product.id).toString("base64"),
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: false,
          startCursor: edges[0]?.cursor ?? null,
          endCursor: edges[edges.length - 1]?.cursor ?? null,
        },
        totalCount: resultProducts.length,
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
