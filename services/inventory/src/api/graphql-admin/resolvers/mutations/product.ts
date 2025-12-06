import type { Resolvers } from "../../generated/types.js";
import {
  ProductCreateScript,
  ProductUpdateScript,
  ProductDeleteScript,
  ProductPublishScript,
  ProductUnpublishScript,
} from "../../../../scripts/product/index.js";
import { noDatabaseError } from "../utils.js";

export const productMutationResolvers: Resolvers = {
  InventoryMutation: {
    productCreate: async (_parent, _args, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ product: null });
      }

      const result = await ctx.kernel.runScript(ProductCreateScript, {});

      return {
        product: result.product ?? null,
        userErrors: result.userErrors,
      };
    },

    productUpdate: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ product: null });
      }

      const result = await ctx.kernel.runScript(ProductUpdateScript, {
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
        features: input.features
          ? {
              create: input.features.create?.map((f) => ({
                slug: f.slug,
                name: f.name,
                values: f.values.map((v) => ({
                  slug: v.slug,
                  name: v.name,
                })),
              })),
              update: input.features.update?.map((f) => ({
                id: f.id,
                slug: f.slug ?? undefined,
                name: f.name ?? undefined,
                values: f.values
                  ? {
                      create: f.values.create?.map((v) => ({
                        slug: v.slug,
                        name: v.name,
                      })),
                      update: f.values.update?.map((v) => ({
                        id: v.id,
                        slug: v.slug ?? undefined,
                        name: v.name ?? undefined,
                      })),
                      delete: f.values.delete ?? undefined,
                    }
                  : undefined,
              })),
              delete: input.features.delete ?? undefined,
            }
          : undefined,
        options: input.options
          ? {
              create: input.options.create?.map((o) => ({
                slug: o.slug,
                name: o.name,
                displayType: o.displayType,
                values: o.values.map((v) => ({
                  slug: v.slug,
                  name: v.name,
                  swatch: v.swatch
                    ? {
                        swatchType: v.swatch.swatchType,
                        colorOne: v.swatch.colorOne ?? undefined,
                        colorTwo: v.swatch.colorTwo ?? undefined,
                        fileId: v.swatch.fileId ?? undefined,
                        metadata: v.swatch.metadata,
                      }
                    : undefined,
                })),
              })),
              update: input.options.update?.map((o) => ({
                id: o.id,
                slug: o.slug ?? undefined,
                name: o.name ?? undefined,
                displayType: o.displayType ?? undefined,
                values: o.values
                  ? {
                      create: o.values.create?.map((v) => ({
                        slug: v.slug,
                        name: v.name,
                        swatch: v.swatch
                          ? {
                              swatchType: v.swatch.swatchType,
                              colorOne: v.swatch.colorOne ?? undefined,
                              colorTwo: v.swatch.colorTwo ?? undefined,
                              fileId: v.swatch.fileId ?? undefined,
                              metadata: v.swatch.metadata,
                            }
                          : undefined,
                      })),
                      update: o.values.update?.map((v) => ({
                        id: v.id,
                        slug: v.slug ?? undefined,
                        name: v.name ?? undefined,
                        swatch: v.swatch === null
                          ? null
                          : v.swatch
                            ? {
                                swatchType: v.swatch.swatchType,
                                colorOne: v.swatch.colorOne ?? undefined,
                                colorTwo: v.swatch.colorTwo ?? undefined,
                                fileId: v.swatch.fileId ?? undefined,
                                metadata: v.swatch.metadata,
                              }
                            : undefined,
                      })),
                      delete: o.values.delete ?? undefined,
                    }
                  : undefined,
              })),
              delete: input.options.delete ?? undefined,
            }
          : undefined,
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

      const result = await ctx.kernel.runScript(ProductDeleteScript, {
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

      const result = await ctx.kernel.runScript(ProductPublishScript, {
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

      const result = await ctx.kernel.runScript(ProductUnpublishScript, {
        id: input.id,
      });

      return {
        product: result.product ?? null,
        userErrors: result.userErrors,
      };
    },
  },
};
