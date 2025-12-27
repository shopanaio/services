import { parseGraphqlInfo } from "@shopana/type-resolver";
import { StoreResolver } from "../../../resolvers/admin/StoreResolver.js";
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

      // Get all stores in the organization
      const allStores = await ctx.kernel
        .getServices()
        .repository.store.findByOrganization(organizationId);

      if (allStores.length === 0) return [];

      // Build batch enforce requests
      const requests = allStores.map((store) => ({
        userId: ctx.user!.id,
        domain: `store:${store.id}`,
        resource: "*",
        action: "read",
      }));

      // Check permissions for all stores at once
      const { results } = (await ctx.kernel
        .getServices()
        .broker.call("iam.batchAuthorize", { organizationId, requests })) as {
        results: boolean[];
      };

      // Filter allowed stores
      const accessibleStores = allStores.filter((_, i) => results[i]);

      if (accessibleStores.length === 0) return [];

      const stores = await StoreResolver.loadMany(
        accessibleStores,
        parseGraphqlInfo(info),
        ctx
      );
      return (stores ?? []) as any;
    },

    currentStore: async (_parent: unknown, _args: unknown, ctx, info) => {
      // Need storeName from header and authenticated user
      if (!ctx.user || !ctx.storeName) return null;

      const store = await ctx.kernel
        .getServices()
        .repository.store.findBySlug(ctx.storeName);

      if (!store) {
        return null;
      }

      return StoreResolver.load(store, parseGraphqlInfo(info), ctx);
    },

    apiKeys: async (_parent, _args, _ctx) => {
      return [];
    },
  },
} satisfies Partial<Resolvers>;
