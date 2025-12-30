import type { Resolvers } from "../../../resolvers/admin/generated/types.js";

/**
 * Type resolvers for interfaces and scalars.
 *
 * Note: Product, Variant, and Warehouse resolvers with @SubgraphReference
 * are now exported directly from index.ts. Their __resolveReference
 * is handled automatically by the decorator.
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
};
