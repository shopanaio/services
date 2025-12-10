import { parseGraphqlInfo } from "@shopana/type-executor";
import {
  ProductView,
  VariantView,
  WarehouseConnectionView,
  WarehouseView,
} from "../../../views/admin/index.js";
import type { Resolvers } from "../generated/types.js";
import { requireContext, requireKernel } from "./utils.js";

export const queryResolvers: Partial<Resolvers> = {
  Query: {
    inventoryQuery: (() => ({})) as any,
  },

  InventoryQuery: {
    node: async (_parent, { id }, ctx, info) => {
      return ProductView.load(id, parseGraphqlInfo(info), requireContext(ctx));
    },

    nodes: async (_parent, { ids }, ctx, info) => {
      return ProductView.loadMany(ids, parseGraphqlInfo(info), requireContext(ctx));
    },

    product: async (_parent, { id }, ctx, info) => {
      return ProductView.load(id, parseGraphqlInfo(info), requireContext(ctx));
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
        parseGraphqlInfo(info),
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
      return VariantView.load(id, parseGraphqlInfo(info), requireContext(ctx));
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
        parseGraphqlInfo(info),
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
      return WarehouseView.load(id, parseGraphqlInfo(info), requireContext(ctx));
    },

    warehouses: async (_parent, args, ctx, info) => {
      return WarehouseConnectionView.load(
        {
          after: args.after ?? undefined,
          before: args.before ?? undefined,
          first: args.first ?? undefined,
          last: args.last ?? undefined,
        },
        parseGraphqlInfo(info),
        requireContext(ctx)
      );
    },
  },
};
