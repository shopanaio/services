import type { Resolvers } from "../generated/types.js";
import { requireKernel } from "./utils.js";
import { ProductView } from "../../../views/admin/index.js";

export const queryResolvers: Resolvers = {
  Query: {
    inventoryQuery: () => ({}),
  },

  InventoryQuery: {
    node: async (_parent, { id }, _ctx, info) => {
      return ProductView.load(id, info);
    },

    nodes: async (_parent, { ids }, _ctx, info) => {
      return ProductView.loadMany(ids, info);
    },

    product: async (_parent, { id }, _ctx, info) => {
      return ProductView.load(id, info);
    },

    products: async (_parent, args, ctx, info) => {
      const kernel = requireKernel(ctx);
      const services = kernel.getServices();
      const first = args.first ?? 10;

      // Get product IDs first
      const products = await services.repository.productQuery.getMany({
        limit: first + 1,
      });

      const hasNextPage = products.length > first;
      const resultProducts = hasNextPage ? products.slice(0, first) : products;

      // Resolve all products using executor
      const productIds = resultProducts.map((p) => p.id);
      const resolvedProducts = await ProductView.loadMany(productIds, info);

      // Build edges with resolved products
      const edges = resolvedProducts.map((product, index) => ({
        node: product,
        cursor: Buffer.from(resultProducts[index].id).toString("base64"),
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

    variant: async () => {
      throw new Error("Not implemented");
    },

    variants: async () => {
      throw new Error("Not implemented");
    },

    warehouse: async () => {
      throw new Error("Not implemented");
    },

    warehouses: async () => {
      throw new Error("Not implemented");
    },
  },
};
