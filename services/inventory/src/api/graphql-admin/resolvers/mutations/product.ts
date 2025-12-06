import type { Resolvers } from "../../generated/types.js";
import {
  productCreate,
  productUpdate,
  productDelete,
  productPublish,
  productUnpublish,
} from "../../../../scripts/product/index.js";
import { noDatabaseError } from "../utils.js";

export const productMutationResolvers: Resolvers = {
  InventoryMutation: {
    productCreate: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ product: null });
      }

      const result = await ctx.kernel.executeScript(productCreate, {
        title: input.title,
        description: input.description
          ? {
              text: input.description.text,
              html: input.description.html,
              json: input.description.json as Record<string, unknown>,
            }
          : undefined,
        excerpt: input.excerpt ?? undefined,
        seoTitle: input.seoTitle ?? undefined,
        seoDescription: input.seoDescription ?? undefined,
        features: input.features
          ? input.features.map((f) => ({
              slug: f.slug,
              name: f.name,
              values: f.values.map((v) => ({
                slug: v.slug,
                name: v.name,
              })),
            }))
          : undefined,
        publish: input.publish ?? undefined,
      });

      return {
        product: result.product ?? null,
        userErrors: result.userErrors,
      };
    },

    productUpdate: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ product: null });
      }

      const result = await ctx.kernel.executeScript(productUpdate, {
        id: input.id,
        title: input.title ?? undefined,
        description: input.description
          ? {
              text: input.description.text,
              html: input.description.html,
              json: input.description.json as Record<string, unknown>,
            }
          : undefined,
        excerpt: input.excerpt ?? undefined,
        seoTitle: input.seoTitle ?? undefined,
        seoDescription: input.seoDescription ?? undefined,
      });

      return {
        product: result.product ?? null,
        userErrors: result.userErrors,
      };
    },

    productDelete: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ deletedProductId: null });
      }

      const result = await ctx.kernel.executeScript(productDelete, {
        id: input.id,
        permanent: input.permanent ?? undefined,
      });

      return {
        deletedProductId: result.deletedProductId ?? null,
        userErrors: result.userErrors,
      };
    },

    productPublish: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ product: null });
      }

      const result = await ctx.kernel.executeScript(productPublish, {
        id: input.id,
      });

      return {
        product: result.product ?? null,
        userErrors: result.userErrors,
      };
    },

    productUnpublish: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ product: null });
      }

      const result = await ctx.kernel.executeScript(productUnpublish, {
        id: input.id,
      });

      return {
        product: result.product ?? null,
        userErrors: result.userErrors,
      };
    },
  },
};
