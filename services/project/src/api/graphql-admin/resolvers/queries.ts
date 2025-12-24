import { parseGraphqlInfo } from "@shopana/type-resolver";
import { StoreResolver } from "../../../resolvers/admin/StoreType.js";
import type { QueryResolvers, Resolvers } from "../generated/types.js";
import { requireContext } from "./utils.js";

export const queryResolvers = {
  Query: {
    storeQuery: () => ({} as any),
  },

  StoreQuery: {
    stores: async (_parent, _args, ctx, info) => {
      const stores = await ctx.kernel
        .getServices()
        .repository.store.getMany();
      const storeIds = stores.map((s) => s.id);

      return StoreResolver.loadMany(
        storeIds,
        parseGraphqlInfo(info),
        requireContext(ctx)
      );
    },

    store: async (_parent, _args, ctx, info) => {
      // Store is already loaded and validated in contextMiddleware via GetCurrentStoreScript
      // The middleware ensures user has access to this store
      if (!ctx.store?.id) return null;

      return StoreResolver.load(
        ctx.store.id,
        parseGraphqlInfo(info),
        requireContext(ctx)
      );
    },

    apiKeys: async (_parent, _args, _ctx) => {
      return [];
    },
  },
} satisfies Partial<Resolvers>;
