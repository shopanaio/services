import { parseGraphqlInfo } from "@shopana/type-resolver";
import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { GraphQLResolveInfo } from "graphql";
import type { Resolvers } from "../../../resolvers/admin/generated/types.js";
import type { ServiceContext } from "../../../context/types.js";
import { VariantFederationResolver } from "../../../resolvers/admin/VariantFederationResolver.js";
import { InventoryItemResolver } from "../../../resolvers/admin/InventoryItemResolver.js";
import { WarehouseResolver } from "../../../resolvers/admin/WarehouseResolver.js";
import { StockResolver } from "../../../resolvers/admin/StockResolver.js";

/**
 * Type resolvers for interfaces, scalars, and federation references.
 */
export const typeResolvers: Partial<Resolvers> = {
  // Interface resolvers
  Node: {
    __resolveType: (obj: unknown) => {
      if (obj instanceof StockResolver) return "WarehouseStock";
      if (obj instanceof WarehouseResolver) return "Warehouse";
      if (obj instanceof InventoryItemResolver) return "InventoryItem";

      const record = obj as Record<string, unknown>;
      if ("quantityOnHand" in record) return "WarehouseStock";
      if ("code" in record) return "Warehouse";
      if ("variantId" in record) return "InventoryItem";
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
      const variantId = decodeGlobalIdByType(reference.id, GlobalIdEntity.Variant);
      return VariantFederationResolver.load(variantId, fieldInfo, ctx);
    },
  },

  InventoryItem: {
    __resolveReference: async (
      reference: { __typename: "InventoryItem"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      const itemId = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.InventoryItem,
      );
      return InventoryItemResolver.load(itemId, fieldInfo, ctx);
    },
  },

  Warehouse: {
    __resolveReference: async (
      reference: { __typename: "Warehouse"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      const warehouseId = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.Warehouse,
      );
      return WarehouseResolver.load(warehouseId, fieldInfo, ctx);
    },
  },
};
