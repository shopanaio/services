import { ProductView, VariantView, WarehouseView } from "../../../views/admin/index.js";
import type { Resolvers } from "../generated/types.js";
import { requireContext, requireKernel } from "./utils.js";

export const queryResolvers: Partial<Resolvers> = {
  Query: {
    inventoryQuery: (() => ({})) as any,
  },

  InventoryQuery: {
    node: async (_parent, { id }, ctx, info) => {
      return ProductView.load(id, info, requireContext(ctx));
    },

    nodes: async (_parent, { ids }, ctx, info) => {
      return ProductView.loadMany(ids, info, requireContext(ctx));
    },

    product: async (_parent, { id }, ctx, info) => {
      return ProductView.load(id, info, requireContext(ctx));
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
        requireContext(ctx)
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

    variant: async (_parent, { id }, ctx, info) => {
      return VariantView.load(id, info, requireContext(ctx));
    },

    variants: async (_parent, args, ctx, info) => {
      const kernel = requireKernel(ctx);

      const services = kernel.getServices();
      const first = args.first ?? 10;

      const variants = await services.repository.variantQuery.getMany({
        limit: first + 1,
      });

      const hasNextPage = variants.length > first;
      const resultVariants = hasNextPage ? variants.slice(0, first) : variants;

      const variantIds = resultVariants.map((v) => v.id);
      const resolvedVariants = await VariantView.loadMany(
        variantIds,
        info,
        requireContext(ctx)
      );

      const edges = resolvedVariants.map((variant, index) => ({
        node: variant,
        cursor: Buffer.from(resultVariants[index].id).toString("base64"),
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: false,
          startCursor: edges[0]?.cursor ?? null,
          endCursor: edges[edges.length - 1]?.cursor ?? null,
        },
        totalCount: resultVariants.length,
      };
    },

    warehouse: async (_parent, { id }, ctx, info) => {
      return WarehouseView.load(id, info, requireContext(ctx));
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
      const resolvedWarehouses = await WarehouseView.loadMany(
        warehouseIds,
        info,
        requireContext(ctx)
      );

      const edges = resolvedWarehouses.map((warehouse, index: number) => ({
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
