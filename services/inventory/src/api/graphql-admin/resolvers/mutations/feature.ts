import { parseGraphqlInfo } from "@shopana/type-executor";
import type { Resolvers, ProductFeature } from "../../generated/types.js";
import {
  FeatureCreateScript,
  FeatureUpdateScript,
  FeatureDeleteScript,
} from "../../../../scripts/feature/index.js";
import { FeatureView } from "../../../../views/admin/index.js";
import { noDatabaseError, requireContext } from "../utils.js";

export const featureMutationResolvers: Resolvers = {
  InventoryMutation: {
    productFeatureCreate: async (_parent, { input }, ctx, info) => {
      if (!ctx.kernel) {
        return noDatabaseError({ feature: null });
      }

      const result = await ctx.kernel.runScript(FeatureCreateScript, {
        productId: input.productId,
        slug: input.slug,
        name: input.name,
        values: input.values.map((v) => ({
          slug: v.slug,
          name: v.name,
        })),
      });

      const featureFieldInfo = parseGraphqlInfo(info, "feature");

      return {
        feature: result.feature
          ? ((await FeatureView.load(
              result.feature.id,
              featureFieldInfo,
              requireContext(ctx)
            )) as ProductFeature)
          : null,
        userErrors: result.userErrors,
      };
    },

    productFeatureUpdate: async (_parent, { input }, ctx, info) => {
      if (!ctx.kernel) {
        return noDatabaseError({ feature: null });
      }

      const result = await ctx.kernel.runScript(FeatureUpdateScript, {
        id: input.id,
        slug: input.slug ?? undefined,
        name: input.name ?? undefined,
        values: input.values
          ? {
              create: input.values.create?.map((v) => ({
                slug: v.slug,
                name: v.name,
              })),
              update: input.values.update?.map((v) => ({
                id: v.id,
                slug: v.slug ?? undefined,
                name: v.name ?? undefined,
              })),
              delete: input.values.delete ?? undefined,
            }
          : undefined,
      });

      const featureFieldInfo = parseGraphqlInfo(info, "feature");

      return {
        feature: result.feature
          ? ((await FeatureView.load(
              result.feature.id,
              featureFieldInfo,
              requireContext(ctx)
            )) as ProductFeature)
          : null,
        userErrors: result.userErrors,
      };
    },

    productFeatureDelete: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ deletedFeatureId: null });
      }

      const result = await ctx.kernel.runScript(FeatureDeleteScript, {
        id: input.id,
      });

      return {
        deletedFeatureId: result.deletedFeatureId ?? null,
        userErrors: result.userErrors,
      };
    },
  },
};
