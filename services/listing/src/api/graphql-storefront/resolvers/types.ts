import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { GraphQLResolveInfo } from "graphql";
import type { ServiceContext } from "../../../context/types.js";
import { CategoryResolver } from "../../../resolvers/storefront/CategoryResolver.js";
import { FacetResolver } from "../../../resolvers/storefront/FacetResolver.js";
import { FacetSwatchResolver } from "../../../resolvers/storefront/FacetSwatchResolver.js";
import { FacetValueResolver } from "../../../resolvers/storefront/FacetValueResolver.js";
import { ProductConnectionResolver } from "../../../resolvers/storefront/ProductConnectionResolver.js";
import type {
  Resolvers,
  ResolversTypes,
} from "../../../resolvers/storefront/generated/types.js";

export const typeResolvers: Partial<Resolvers> = {
  Node: {
    __resolveType: (value) => {
      if (value instanceof FacetResolver) return "Facet";
      if (value instanceof FacetValueResolver) return "FacetValue";
      if (value instanceof FacetSwatchResolver) return "FacetSwatch";
      return null;
    },
  },

  Connection: {
    __resolveType: (value) =>
      value instanceof ProductConnectionResolver ? "ProductConnection" : null,
  },

  Product: {
    __resolveReference: (reference) =>
      reference as unknown as ResolversTypes["Product"],
  },

  Category: {
    __resolveReference: (
      reference: { id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo
    ) =>
      CategoryResolver.load(
        decodeGlobalIdByType(reference.id, GlobalIdEntity.Category),
        parseGraphqlInfo(info),
        ctx
      ),
  },

  Facet: {
    __resolveReference: async (
      reference: { id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo
    ) => {
      const id = decodeGlobalIdByType(reference.id, GlobalIdEntity.Facet);
      if (!(await ctx.loaders.facet.load(id))) return null;
      return FacetResolver.load(id, parseGraphqlInfo(info), ctx);
    },
  },

  FacetValue: {
    __resolveReference: async (
      reference: { id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo
    ) => {
      const id = decodeGlobalIdByType(reference.id, GlobalIdEntity.FacetValue);
      const value = await ctx.loaders.facetValue.load(id);
      if (
        !value ||
        !value.enabled ||
        value.parentId !== null ||
        value.referenceStatus !== "VALID"
      ) {
        return null;
      }
      return FacetValueResolver.load(id, parseGraphqlInfo(info), ctx);
    },
  },

  FacetSwatch: {
    __resolveReference: async (
      reference: { id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo
    ) => {
      const id = decodeGlobalIdByType(reference.id, GlobalIdEntity.FacetSwatch);
      const swatch = await ctx.loaders.facetSwatch.load(id);
      const swatchType = swatch?.swatchType.toUpperCase();
      if (!swatch || (swatchType !== "COLOR" && swatchType !== "GRADIENT")) {
        return null;
      }
      return FacetSwatchResolver.load(id, parseGraphqlInfo(info), ctx);
    },
  },
};
