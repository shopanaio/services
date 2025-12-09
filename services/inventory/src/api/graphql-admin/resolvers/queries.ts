import type { Resolvers } from "../generated/types.js";
import { requireKernel, createViewContext } from "./utils.js";
import { parseGraphQLInfoDeep } from "@shopana/type-executor/graphql";
import { executor } from "@shopana/type-executor";
import { ProductView } from "../../../views/admin/index.js";

export const queryResolvers: Resolvers = {
  Query: {
    inventoryQuery: () => ({}),
  },

  InventoryQuery: {
    node: async (_parent, { id }, ctx, info) => {
      const kernel = requireKernel(ctx);
      const viewCtx = createViewContext(kernel);
      const fieldArgs = parseGraphQLInfoDeep(info, ProductView);
      return executor.resolve(ProductView, id, fieldArgs, viewCtx);
    },

    nodes: async (_parent, { ids }, ctx, info) => {
      const kernel = requireKernel(ctx);
      const viewCtx = createViewContext(kernel);
      const fieldArgs = parseGraphQLInfoDeep(info, ProductView);
      return executor.resolveMany(ProductView, ids, fieldArgs, viewCtx);
    },

    product: async (_parent, { id }, ctx, info) => {
      const kernel = requireKernel(ctx);
      const viewCtx = createViewContext(kernel);
      const fieldArgs = parseGraphQLInfoDeep(info, ProductView);
      return executor.resolve(ProductView, id, fieldArgs, viewCtx);
    },

    products: async (_parent, args, ctx, info) => {
      const kernel = requireKernel(ctx);
      const services = kernel.getServices();
      const viewCtx = createViewContext(kernel);
      const first = args.first ?? 10;

      // Get product IDs first
      const products = await services.repository.productQuery.getMany({
        limit: first + 1,
      });

      const hasNextPage = products.length > first;
      const resultProducts = hasNextPage ? products.slice(0, first) : products;

      // Resolve all products using executor
      const productIds = resultProducts.map((p) => p.id);
      const fieldArgs = parseGraphQLInfoDeep(info, ProductView);
      const resolvedProducts = await executor.resolveMany(ProductView, productIds, fieldArgs, viewCtx);

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
