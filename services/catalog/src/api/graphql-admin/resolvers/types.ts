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
      if ("productId" in record && "optionValueIds" in record) return "Variant";
      if ("displayType" in record) return "ProductOption";
      if ("swatchType" in record) return "ProductOptionSwatch";
      if ("amountMinor" in record) return "VariantPrice";
      if ("unitCostMinor" in record) return "VariantCost";
      if ("isGroup" in record) return "ProductFeature";
      if ("featureId" in record) return "ProductFeatureValue";
      if ("collapsed" in record && "sortIndex" in record && !("path" in record))
        return "FacetGroup";
      if ("facetType" in record && "selectionMode" in record) return "Facet";
      if ("enabled" in record && "facetId" in record && "slug" in record)
        return "FacetValue";
      if ("swatchType" in record && "colorOne" in record && !("displayType" in record))
        return "FacetSwatch";
      if ("effectiveFrom" in record && "defaultSort" in record) return "Collection";
      if ("handle" in record && "path" in record) return "Category";
      if ("handle" in record && !("path" in record)) return "Tag";
      if ("optionId" in record) return "ProductOptionValue";
      return null;
    },
  },

  UserError: {
    __resolveType: () => "GenericUserError",
  },
};
