import type { Resolvers } from "../../generated/types.js";
import {
  productOptionCreate,
  productOptionUpdate,
  productOptionDelete,
} from "../../../../scripts/option/index.js";
import { noDatabaseError } from "../utils.js";

export const optionMutationResolvers: Resolvers = {
  InventoryMutation: {
    productOptionCreate: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ option: null });
      }

      if (!input.productId) {
        return {
          option: null,
          userErrors: [
            { message: "Product ID is required", field: ["productId"], code: "REQUIRED" },
          ],
        };
      }

      const result = await ctx.kernel.executeScript(productOptionCreate, {
        productId: input.productId,
        slug: input.slug,
        name: input.name,
        displayType: input.displayType,
        values: input.values.map((v) => ({
          slug: v.slug,
          name: v.name,
          swatch: v.swatch
            ? {
                swatchType: v.swatch.swatchType,
                colorOne: v.swatch.colorOne ?? undefined,
                colorTwo: v.swatch.colorTwo ?? undefined,
                fileId: v.swatch.fileId ?? undefined,
                metadata: v.swatch.metadata ?? undefined,
              }
            : undefined,
        })),
      });

      return {
        option: result.option ?? null,
        userErrors: result.userErrors,
      };
    },

    productOptionUpdate: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ option: null });
      }

      const result = await ctx.kernel.executeScript(productOptionUpdate, {
        id: input.id,
        slug: input.slug ?? undefined,
        name: input.name ?? undefined,
        displayType: input.displayType ?? undefined,
        values: input.values
          ? {
              create: input.values.create?.map((v) => ({
                slug: v.slug,
                name: v.name,
                swatch: v.swatch
                  ? {
                      swatchType: v.swatch.swatchType,
                      colorOne: v.swatch.colorOne ?? undefined,
                      colorTwo: v.swatch.colorTwo ?? undefined,
                      fileId: v.swatch.fileId ?? undefined,
                      metadata: v.swatch.metadata ?? undefined,
                    }
                  : undefined,
              })),
              update: input.values.update?.map((v) => ({
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
                        metadata: v.swatch.metadata ?? undefined,
                      }
                    : undefined,
              })),
              delete: input.values.delete ?? undefined,
            }
          : undefined,
      });

      return {
        option: result.option ?? null,
        userErrors: result.userErrors,
      };
    },

    productOptionDelete: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ deletedOptionId: null });
      }

      const result = await ctx.kernel.executeScript(productOptionDelete, {
        id: input.id,
      });

      return {
        deletedOptionId: result.deletedOptionId ?? null,
        userErrors: result.userErrors,
      };
    },
  },
};
