import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { GraphQLResolveInfo } from "graphql";
import type { ServiceContext } from "../../../context/index.js";
import { ProductResolver } from "../../../resolvers/admin/ProductResolver";
import { VariantResolver } from "../../../resolvers/admin/VariantResolver";
import { WarehouseResolver } from "../../../resolvers/admin/WarehouseResolver";
import type { Resolvers } from "../generated/types.js";
import { requireContext } from "./utils.js";

/**
 * Resolves product using executor
 */
async function resolveProduct(
  productId: string,
  ctx: ServiceContext,
  info: GraphQLResolveInfo
) {
  return ProductResolver.load(
    productId,
    parseGraphqlInfo(info),
    requireContext(ctx)
  );
}

/**
 * Resolves variant using executor
 */
async function resolveVariant(
  variantId: string,
  ctx: ServiceContext,
  info: GraphQLResolveInfo
) {
  return VariantResolver.load(
    variantId,
    parseGraphqlInfo(info),
    requireContext(ctx)
  );
}

/**
 * Resolves warehouse using executor
 */
async function resolveWarehouse(
  warehouseId: string,
  ctx: ServiceContext,
  info: GraphQLResolveInfo
) {
  return WarehouseResolver.load(
    warehouseId,
    parseGraphqlInfo(info),
    requireContext(ctx)
  );
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
      ctx: ServiceContext,
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
      ctx: ServiceContext,
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
      ctx: ServiceContext,
      info
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): Promise<any> => {
      return resolveWarehouse(reference.id, ctx, info);
    },
  },
};
