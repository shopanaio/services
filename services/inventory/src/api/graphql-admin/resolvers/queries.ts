import type { GraphQLResolveInfo } from "graphql";
import type { Resolvers } from "../generated/types.js";
import type { GraphQLContext } from "../server.js";
import { dummyVariants } from "./dummy.js";
import { requireKernel } from "./utils.js";
import { parseGraphQLInfoDeep } from "@shopana/type-executor/graphql";
import { ProductView } from "../../../views/admin/index.js";
import type { ProductFieldArgs } from "../../../repositories/ProductTypeRepository.js";

/**
 * Symbol to mark a product as already resolved by executor
 */
const RESOLVED_BY_EXECUTOR = Symbol.for("resolvedByExecutor");

/**
 * Parse Product field arguments from a Connection query (edges.node)
 * Navigates to the node selection set inside edges
 */
function parseProductFieldArgsFromConnection(
  info: GraphQLResolveInfo
): ProductFieldArgs | undefined {
  const fieldNode = info.fieldNodes[0];
  if (!fieldNode?.selectionSet) return undefined;

  // Find edges field
  for (const selection of fieldNode.selectionSet.selections) {
    if (selection.kind !== "Field" || selection.name.value !== "edges") continue;
    if (!selection.selectionSet) continue;

    // Find node field inside edges
    for (const edgeSelection of selection.selectionSet.selections) {
      if (edgeSelection.kind !== "Field" || edgeSelection.name.value !== "node") continue;
      if (!edgeSelection.selectionSet) continue;

      // Create a synthetic info object with the node's selection set
      const syntheticInfo = {
        ...info,
        fieldNodes: [{
          ...fieldNode,
          selectionSet: edgeSelection.selectionSet,
        }],
      } as GraphQLResolveInfo;

      return parseGraphQLInfoDeep(syntheticInfo, ProductView) as ProductFieldArgs;
    }
  }

  return undefined;
}

/**
 * Resolves product using executor with GraphQL field arguments
 */
async function resolveProductWithExecutor(
  productId: string,
  ctx: GraphQLContext,
  info: GraphQLResolveInfo
): Promise<Record<string, unknown> | null> {
  const kernel = requireKernel(ctx);
  const services = kernel.getServices();

  // Parse GraphQL selection set to get field arguments tree
  const fieldArgs = parseGraphQLInfoDeep(info, ProductView) as ProductFieldArgs;

  // Resolve using executor with arguments
  const resolved = await services.repository.productType.resolveById(productId, {
    fieldArgs,
  });

  if (!resolved) return null;

  // Mark as resolved by executor so field resolvers just pass through
  return {
    ...resolved,
    [RESOLVED_BY_EXECUTOR]: true,
    __typename: "Product" as const,
  };
}

export const queryResolvers: Resolvers = {
  Query: {
    inventoryQuery: () => ({}),
  },

  InventoryQuery: {
    node: async (_parent, { id }, ctx, info) => {
      const kernel = requireKernel(ctx);

      // Try to resolve as product using executor
      const product = await resolveProductWithExecutor(id, ctx, info);
      if (product) return product;

      const variant = dummyVariants.get(id);
      if (variant) return variant;

      return null;
    },

    nodes: async (_parent, { ids }, ctx, info) => {
      return Promise.all(
        ids.map(async (id) => {
          // Try to resolve as product using executor
          const product = await resolveProductWithExecutor(id, ctx, info);
          if (product) return product;

          const variant = dummyVariants.get(id);
          if (variant) return variant;

          return null;
        })
      );
    },

    product: async (_parent, { id }, ctx, info) => {
      return resolveProductWithExecutor(id, ctx, info);
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

      // Parse field arguments for Product type from the nested selection
      // Look for edges.node selection set
      const fieldArgs = parseProductFieldArgsFromConnection(info);

      // Resolve all products using executor
      const productIds = resultProducts.map((p) => p.id);
      const resolvedProducts = await services.repository.productType.resolveMany(
        productIds,
        { fieldArgs }
      );

      // Build edges with resolved products
      const edges = resolvedProducts.map((product, index) => ({
        node: {
          ...product,
          [RESOLVED_BY_EXECUTOR]: true,
        },
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
