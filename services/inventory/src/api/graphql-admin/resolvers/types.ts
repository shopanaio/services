import type { GraphQLResolveInfo } from "graphql";
import { ProductView, VariantView } from "../../../views/admin/index.js";
import type { Resolvers } from "../generated/types.js";
import type { GraphQLContext } from "../server.js";
import { requireKernel } from "./utils.js";

/**
 * Resolves product using executor
 */
async function resolveProduct(
  productId: string,
  _ctx: GraphQLContext,
  info: GraphQLResolveInfo
) {
  return ProductView.load(productId, info);
}

/**
 * Resolves variant using executor
 */
async function resolveVariant(
  variantId: string,
  _ctx: GraphQLContext,
  info: GraphQLResolveInfo
) {
  return VariantView.load(variantId, info);
}

/**
 * Resolves warehouse by ID
 */
async function resolveWarehouseById(warehouseId: string, ctx: GraphQLContext) {
  const kernel = requireKernel(ctx);
  const services = kernel.getServices();
  return services.repository.warehouse.findById(warehouseId);
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
    __resolveReference: async (
      reference,
      ctx: GraphQLContext,
      info
    ): Promise<any> => {
      return resolveProduct(reference.id, ctx, info);
    },

    variants: (parent) => parent.variants,
  },

  // Variant resolvers
  Variant: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __resolveReference: async (
      reference,
      ctx: GraphQLContext,
      info
    ): Promise<any> => {
      return resolveVariant(reference.id, ctx, info);
    },

    priceHistory: (parent) => parent.priceHistory,
    costHistory: (parent) => parent.costHistory,
  },

  // Warehouse resolvers
  Warehouse: {
    __resolveReference: async (
      reference: { id: string },
      ctx: GraphQLContext
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): Promise<any> => {
      return resolveWarehouseById(reference.id, ctx);
    },
  },
};
