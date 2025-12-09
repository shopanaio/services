import type { Resolvers, Product } from "../generated/types.js";
import { requireKernel } from "./utils.js";
import { ProductView } from "../../../views/admin/index.js";
import { executor } from "@shopana/type-executor";

export const queryResolvers: Partial<Resolvers> = {
  Query: {
    inventoryQuery: (() => ({})) as any,
  },

  InventoryQuery: {
    node: async (_parent, { id }, _ctx, info) => {
      return executor.resolve<typeof ProductView, Product>(
        ProductView,
        id,
        info
      );
    },

    nodes: async (_parent, { ids }, _ctx, info) => {
      return executor.resolveMany<typeof ProductView, Product>(
        ProductView,
        ids,
        info
      );
    },

    product: async (_parent, { id }, _ctx, info) => {
      return executor.resolve<typeof ProductView, Product>(
        ProductView,
        id,
        info
      );
    },

    products: async (_parent, args, ctx, info) => {
      const kernel = requireKernel(ctx);
      const services = kernel.getServices();
      const first = args.first ?? 10;

      const products = await services.repository.productQuery.getMany({
        limit: first + 1,
      });

      const hasNextPage = products.length > first;
      const resultProducts = hasNextPage ? products.slice(0, first) : products;

      const productIds = resultProducts.map((p) => p.id);
      const resolvedProducts = await executor.resolveMany<
        typeof ProductView,
        Product
      >(ProductView, productIds, info);

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
