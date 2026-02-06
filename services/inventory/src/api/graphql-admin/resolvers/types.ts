import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { GraphQLResolveInfo } from "graphql";
import type { Resolvers } from "../../../resolvers/admin/generated/types.js";
import type { ServiceContext } from "../../../context/types.js";
import { VariantFederationResolver } from "../../../resolvers/admin/VariantFederationResolver.js";
import { InventoryItemResolver } from "../../../resolvers/admin/InventoryItemResolver.js";
import { WarehouseResolver } from "../../../resolvers/admin/WarehouseResolver.js";

/**
 * Type resolvers for interfaces, scalars, and federation references.
 */
export const typeResolvers: Partial<Resolvers> = {
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

  // Federation reference resolvers
  Variant: {
    __resolveReference: async (
      reference: { __typename: "Variant"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      return VariantFederationResolver.load(reference.id, fieldInfo, ctx);
    },
  },

  InventoryItem: {
    __resolveReference: async (
      reference: { __typename: "InventoryItem"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      return InventoryItemResolver.load(reference.id, fieldInfo, ctx);
    },
  },

  Warehouse: {
    __resolveReference: async (
      reference: { __typename: "Warehouse"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      return WarehouseResolver.load(reference.id, fieldInfo, ctx);
    },
  },
};
