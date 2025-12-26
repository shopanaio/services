import { parseGraphqlInfo } from "@shopana/type-resolver";
import { StoreResolver } from "../../../resolvers/admin/StoreType.js";
import type { Resolvers } from "../generated/types.js";

export const queryResolvers = {
  Query: {
    storeQuery: () => ({} as any),
  },

  StoreQuery: {
    stores: async (_parent, _args, ctx, info) => {
      // User must be authenticated and have organization context
      // organizationId comes from x-organization-id header
      const organizationId = ctx.organizationId ?? ctx.store?.organizationId;
      if (!ctx.user?.id || !organizationId) return [];

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

    store: async (_parent, args, ctx, info) => {
      // If store is loaded from context (via X-Store-Name header), use it
      if (ctx.store?.id && ctx.store?.slug === args.slug) {
        // Context store matches - user already authorized by middleware
        return StoreResolver.load(ctx.store.id, parseGraphqlInfo(info), ctx);
      }

      // No matching store in context - load by slug and check authorization
      const store = await ctx.kernel
        .getServices()
        .repository.store.findBySlug(args.slug);

      if (!store || !store.organizationId) return null;

      // Check user has access to this store via IAM
      if (!ctx.user?.id) return null;

      const authResult = (await ctx.kernel
        .getServices()
        .broker.call("iam.authorize", {
          userId: ctx.user.id,
          organizationId: store.organizationId,
          domain: `store:${store.id}`,
          resource: "*",
          action: "read",
        })) as { allowed: boolean };

      if (!authResult.allowed) return null;

      return StoreResolver.load(store.id, parseGraphqlInfo(info), ctx);
    },

    apiKeys: async (_parent, _args, _ctx) => {
      return [];
    },
  },
} satisfies Partial<Resolvers>;
