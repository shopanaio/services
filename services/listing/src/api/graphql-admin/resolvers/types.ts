import { FacetResolver } from "../../../resolvers/admin/FacetResolver.js";
import { FacetSwatchResolver } from "../../../resolvers/admin/FacetSwatchResolver.js";
import { FacetValueResolver } from "../../../resolvers/admin/FacetValueResolver.js";

export const typeResolvers = {
  Node: {
    __resolveType: (obj: unknown) => {
      if (obj instanceof FacetResolver) return "Facet";
      if (obj instanceof FacetValueResolver) return "FacetValue";
      if (obj instanceof FacetSwatchResolver) return "FacetSwatch";
      const typename = (obj as { __typename?: string }).__typename;
      return typename ?? null;
    },
  },

  Listing: {
    __resolveType: (obj: unknown) => {
      const typename = (obj as { __typename?: string }).__typename;
      return typename === "Product" || typename === "Bundle" ? typename : null;
    },
  },

  UserError: {
    __resolveType: () => "GenericUserError",
  },
};
