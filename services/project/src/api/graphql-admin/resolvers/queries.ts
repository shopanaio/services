import { parseGraphqlInfo } from "@shopana/type-resolver";
import { StoreResolver } from "../../../resolvers/admin/StoreType.js";
import type { Resolvers } from "../generated/types.js";

export const queryResolvers = {
  Query: {
    storeQuery: () => ({} as any),
  },

  StoreQuery: {
    stores: async (_parent, args, ctx, info) => {
      // User must be authenticated
      if (!ctx.user?.id) return [];

      // organizationId comes from query arguments
      const { organizationId } = args;

      // Get all store IDs in the organization
      const allStoreIds = await ctx.kernel
        .getServices()
        .repository.store.getIdsByOrganization(organizationId);

      if (allStoreIds.length === 0) return [];

      // Build batch enforce requests
      const requests = allStoreIds.map((storeId) => ({
        userId: ctx.user!.id,
        domain: `store:${storeId}`,
        resource: "*",
        action: "read",
      }));

      // Check permissions for all stores at once
      const { results } = (await ctx.kernel
        .getServices()
        .broker.call("iam.batchAuthorize", { organizationId, requests })) as {
        results: boolean[];
      };

      // Filter allowed store IDs
      const accessibleIds = allStoreIds.filter((_, i) => results[i]);

      if (accessibleIds.length === 0) return [];

      const stores = await StoreResolver.loadMany(
        accessibleIds,
        parseGraphqlInfo(info),
        ctx
      );
      return (stores ?? []) as any;
    },

    currentStore: async (_parent: unknown, _args: unknown, ctx, info) => {
      // Need storeName from header and authenticated user
      if (!ctx.storeName || !ctx.user?.id) return null;

      // Check if store already loaded in context
      if (ctx.store?.slug === ctx.storeName) {
        return StoreResolver.load(ctx.store.id, parseGraphqlInfo(info), ctx);
      }

      // Load store by slug
      const store = await ctx.kernel
        .getServices()
        .repository.store.findBySlug(ctx.storeName);

      if (!store?.organizationId) return null;

      // Cache store in context for subsequent queries
      ctx.setStore(store);

      return StoreResolver.load(store.id, parseGraphqlInfo(info), ctx);
    },

    apiKeys: async (_parent, _args, _ctx) => {
      return [];
    },
  },
} satisfies Partial<Resolvers>;
