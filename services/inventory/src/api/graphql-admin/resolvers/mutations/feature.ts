import type { Resolvers } from "../../generated/types.js";
import {
  productFeatureCreate,
  productFeatureUpdate,
  productFeatureDelete,
} from "../../../../scripts/feature/index.js";

export const featureMutationResolvers: Resolvers = {
  InventoryMutation: {
    productFeatureCreate: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return {
          feature: null,
          userErrors: [
            { message: "Database not configured", code: "NO_DATABASE" },
          ],
        };
      }

      const result = await ctx.kernel.executeScript(productFeatureCreate, {
        productId: input.productId,
        slug: input.slug,
        name: input.name,
        values: input.values.map((v) => ({
          slug: v.slug,
          name: v.name,
        })),
      });

      return {
        feature: result.feature ?? null,
        userErrors: result.userErrors,
      };
    },

    productFeatureUpdate: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return {
          feature: null,
          userErrors: [
            { message: "Database not configured", code: "NO_DATABASE" },
          ],
        };
      }

      const result = await ctx.kernel.executeScript(productFeatureUpdate, {
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

      return {
        feature: result.feature ?? null,
        userErrors: result.userErrors,
      };
    },

    productFeatureDelete: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return {
          deletedFeatureId: null,
          userErrors: [
            { message: "Database not configured", code: "NO_DATABASE" },
          ],
        };
      }

      const result = await ctx.kernel.executeScript(productFeatureDelete, {
        id: input.id,
      });

      return {
        deletedFeatureId: result.deletedFeatureId ?? null,
        userErrors: result.userErrors,
      };
    },
  },
};
