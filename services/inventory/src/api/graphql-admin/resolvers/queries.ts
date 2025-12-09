import { InventoryContext } from "../../../context/types.js";
import { ProductView, WarehouseView } from "../../../views/admin/index.js";
import type { Product, Resolvers, Warehouse } from "../generated/types.js";
import { requireKernel } from "./utils.js";

export const queryResolvers: Partial<Resolvers> = {
  Query: {
    inventoryQuery: (() => ({})) as any,
  },

  InventoryQuery: {
    node: async (_parent, { id }, ctx, info) => {
      return ProductView.load(id, info, ctx._inventoryContext);
    },

    nodes: async (_parent, { ids }, ctx, info) => {
      return ProductView.loadMany(ids, info, ctx._inventoryContext);
    },

    product: async (_parent, { id }, _ctx, info) => {
      return ProductView.load(id, info, ctx._inventoryContext);
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
      const resolvedProducts = await ProductView.loadMany(
        productIds,
        info,
        ctx._inventoryContext
      );

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

    warehouse: async (_parent, { id }, ctx, info) => {
      return WarehouseView.load<
        typeof WarehouseView,
        Product,
        InventoryContext
      >(id, info, ctx._inventoryContext);
    },

    warehouses: async (_parent, args, ctx, info) => {
      const kernel = requireKernel(ctx);
      const services = kernel.getServices();
      const first = args.first ?? 10;

      const warehouses = await services.repository.warehouse.getAll(first + 1);

      const hasNextPage = warehouses.length > first;
      const resultWarehouses = hasNextPage
        ? warehouses.slice(0, first)
        : warehouses;

      const warehouseIds = resultWarehouses.map((w) => w.id);
      const resolvedWarehouses = await executor.resolveMany(
        WarehouseView,
        warehouseIds,
        info
      );

      const edges = resolvedWarehouses.map((warehouse, index) => ({
        node: warehouse,
        cursor: Buffer.from(resultWarehouses[index].id).toString("base64"),
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: false,
          startCursor: edges[0]?.cursor ?? null,
          endCursor: edges[edges.length - 1]?.cursor ?? null,
        },
        totalCount: resultWarehouses.length,
      };
    },
  },
};
