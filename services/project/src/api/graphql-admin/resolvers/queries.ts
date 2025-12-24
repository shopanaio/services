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
      // User must be authenticated
      if (!ctx.user?.id) return [];

      // If store context exists, get organizationId from it
      let organizationId = ctx.store?.organizationId;

      // Get all stores
      const allStores = await ctx.kernel
        .getServices()
        .repository.store.getMany();

      // Filter stores by organization
      // If no context organizationId, we need to check each store's IAM integration
      const userStores = [];
      for (const store of allStores) {
        if (!store.integrations?.iam) continue;

        const storeOrgId = store.integrations.iam.config.organizationId;

        // If we have organizationId from context, filter by it
        if (organizationId && storeOrgId !== organizationId) continue;

        // Check user has access to this store
        const authResult = await ctx.kernel.getServices().broker.call(
          "iam.authorize",
          {
            userId: ctx.user.id,
            organizationId: storeOrgId,
            resource: "store",
            action: "read",
          }
        ) as { allowed: boolean };

        if (authResult.allowed) {
          userStores.push(store);
        }
      }

      const storeIds = userStores.map((s) => s.id);

      return StoreResolver.loadMany(
        storeIds,
        parseGraphqlInfo(info),
        requireContext(ctx)
      );
    },

    store: async (_parent, args, ctx, info) => {
      // If store is loaded from context (via X-Store-Name header), use it
      if (ctx.store?.id && ctx.store?.slug === args.slug) {
        // Context store matches - user already authorized by middleware
        return StoreResolver.load(
          ctx.store.id,
          parseGraphqlInfo(info),
          requireContext(ctx)
        );
      }

      // No matching store in context - load by slug and check authorization
      const store = await ctx.kernel
        .getServices()
        .repository.store.findBySlug(args.slug);

      if (!store) return null;

      // Check IAM integration exists
      if (!store.integrations?.iam) return null;

      const organizationId = store.integrations.iam.config.organizationId;

      // Check user has access to this store via IAM
      if (ctx.user?.id) {
        const authResult = await ctx.kernel.getServices().broker.call(
          "iam.authorize",
          {
            userId: ctx.user.id,
            organizationId,
            resource: "store",
            action: "read",
          }
        ) as { allowed: boolean };

        if (!authResult.allowed) return null;
      } else {
        return null;
      }

      return StoreResolver.load(
        store.id,
        parseGraphqlInfo(info),
        requireContext(ctx)
      );
    },

    apiKeys: async (_parent, _args, _ctx) => {
      return [];
    },
  },
} satisfies Partial<Resolvers>;
