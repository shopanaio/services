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
      // User must be authenticated and have store context
      if (!ctx.user?.id || !ctx.store?.organizationId) return [];

      const organizationId = ctx.store.organizationId;

      // Check if user has read access to stores in this organization
      const authResult = (await ctx.kernel.getServices().broker.call(
        "iam.authorize",
        {
          userId: ctx.user.id,
          organizationId,
          resource: "store",
          action: "read",
        }
      )) as { allowed: boolean };

      if (!authResult.allowed) return [];

      // Get all store IDs in the organization
      const storeIds = await ctx.kernel
        .getServices()
        .repository.store.getIdsByOrganization(organizationId);

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
