import type { GraphQLResolveInfo } from "graphql";
import type { Resolvers } from "../generated/types.js";
import type { GraphQLContext } from "../server.js";
import { requireKernel } from "./utils.js";
import { parseGraphQLInfoDeep } from "@shopana/type-executor/graphql";
import { ProductView } from "../../../views/admin/index.js";
import type { ProductFieldArgs } from "../../../repositories/ProductTypeRepository.js";

/**
 * Resolves product using executor with GraphQL field arguments
 */
async function resolveProductWithExecutor(
  productId: string,
  ctx: GraphQLContext,
  info: GraphQLResolveInfo
) {
  const kernel = requireKernel(ctx);
  const services = kernel.getServices();

  const fieldArgs = parseGraphQLInfoDeep(info, ProductView) as ProductFieldArgs;

  const resolved = await services.repository.productType.resolveById(productId, {
    fieldArgs,
  });

  return resolved ?? null;
}

export const typeResolvers: Resolvers = {
  // Interface resolvers
  Node: {
    __resolveType: (obj: unknown) => {
      const record = obj as Record<string, unknown>;
      if ("variants" in record) return "Product";
      if ("productId" in record) return "Variant";
      if ("displayType" in record) return "ProductOption";
      if ("swatchType" in record) return "ProductOptionSwatch";
      if ("quantityOnHand" in record) return "WarehouseStock";
      if ("code" in record) return "Warehouse";
      if ("amountMinor" in record) return "VariantPrice";
      if ("unitCostMinor" in record) return "VariantCost";
      return null;
    },
  },

  UserError: {
    __resolveType: () => "GenericUserError",
  },

  // Product resolvers
  Product: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __resolveReference: async (reference, ctx: GraphQLContext, info): Promise<any> => {
      return resolveProductWithExecutor(reference.id, ctx, info);
    },

    variants: (parent) => parent.variants,
  },

  // Variant resolvers
  Variant: {
    priceHistory: (parent) => parent.priceHistory,
    costHistory: (parent) => parent.costHistory,
  },

  // Warehouse resolvers
  Warehouse: {
    stock: (parent) => parent.stock,
  },
};
