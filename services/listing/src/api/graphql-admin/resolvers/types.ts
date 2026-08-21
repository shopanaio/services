import {
  decodeGlobalId,
  decodeGlobalIdByType,
  GLOBAL_ID_NAMESPACE,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { GraphQLResolveInfo } from "graphql";
import type { ServiceContext } from "../../../context/types.js";
import { CollectionResolver } from "../../../resolvers/admin/CollectionResolver.js";
import { FacetResolver } from "../../../resolvers/admin/FacetResolver.js";
import { FacetSwatchResolver } from "../../../resolvers/admin/FacetSwatchResolver.js";
import { FacetValueResolver } from "../../../resolvers/admin/FacetValueResolver.js";

function resolveListingTypeById(id: unknown): "Product" | null {
  if (typeof id !== "string") return null;

  try {
    const decoded = decodeGlobalId(id);
    if (decoded.namespace !== GLOBAL_ID_NAMESPACE) return null;
    if (decoded.typeName === "Product") return "Product";
    return null;
  } catch {
    return null;
  }
}

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
      if (typename === "Product") return "Product";

      return resolveListingTypeById((obj as { id?: unknown }).id);
    },
  },

  Collection: {
    __resolveReference: (
      reference: { id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      return CollectionResolver.load(
        {
          id: decodeGlobalIdByType(reference.id, GlobalIdEntity.Collection),
        },
        parseGraphqlInfo(info),
        ctx,
      );
    },
  },

  UserError: {
    __resolveType: () => "GenericUserError",
  },
};
