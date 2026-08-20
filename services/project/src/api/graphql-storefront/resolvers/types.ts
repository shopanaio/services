import { parseGraphqlInfo } from "@shopana/type-resolver";
import { decodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { GraphQLResolveInfo } from "graphql";
import type { ServiceContext } from "../../../context/types.js";
import { StoreResolver } from "../../../resolvers/storefront/StoreResolver.js";
import { MarketResolver } from "../../../resolvers/storefront/MarketResolver.js";
import type { Resolvers } from "../../../resolvers/storefront/generated/types.js";

export const typeResolvers: Partial<Resolvers> = {
  Node: {
    __resolveType: (value) => {
      if (value instanceof StoreResolver) return "Store";
      if (value instanceof MarketResolver) return "Market";
      return null;
    },
  },
  Store: {
    __resolveReference: (
      reference: { id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) =>
      StoreResolver.load(
        decodeGlobalIdByType(reference.id, GlobalIdEntity.Store),
        parseGraphqlInfo(info),
        ctx,
      ),
  },
  Market: {
    __resolveReference: (
      reference: { id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) =>
      MarketResolver.load(
        decodeGlobalIdByType(reference.id, GlobalIdEntity.Market),
        parseGraphqlInfo(info),
        ctx,
      ),
  },
};
