import type { Resolvers } from "../../generated/types.js";
import { productCreate } from "../../../../scripts/product/index.js";
import {
  dummyProducts,
  dummyVariants,
} from "../dummy.js";

export const productMutationResolvers: Resolvers = {
  InventoryMutation: {
    productCreate: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return {
          product: null,
          userErrors: [
            { message: "Database not configured", code: "NO_DATABASE" },
          ],
        };
      }

      const result = await ctx.kernel.executeScript(productCreate, {
        publish: input.publish ?? undefined,
      });

      return {
        product: result.product ?? null,
        userErrors: result.userErrors,
      };
    },

    productUpdate: async (_parent, { input }) => {
      const product = dummyProducts.get(input.id);
      if (!product) {
        return {
          product: null,
          userErrors: [
            { field: ["id"], message: "Product not found", code: "NOT_FOUND" },
          ],
        };
      }

      if (input.title) product.title = input.title;
      if (input.description) product.description = input.description;
      if (input.excerpt !== undefined) product.excerpt = input.excerpt;
      if (input.seoTitle !== undefined) product.seoTitle = input.seoTitle;
      if (input.seoDescription !== undefined)
        product.seoDescription = input.seoDescription;
      product.updatedAt = new Date();

      return {
        product,
        userErrors: [],
      };
    },

    productDelete: async (_parent, { input }) => {
      const product = dummyProducts.get(input.id);
      if (!product) {
        return {
          deletedProductId: null,
          userErrors: [
            { field: ["id"], message: "Product not found", code: "NOT_FOUND" },
          ],
        };
      }

      if (input.permanent) {
        dummyProducts.delete(input.id);
        for (const [variantId, variant] of dummyVariants) {
          if (variant.productId === input.id) {
            dummyVariants.delete(variantId);
          }
        }
      } else {
        product.deletedAt = new Date();
        product.updatedAt = new Date();
      }

      return {
        deletedProductId: input.id,
        userErrors: [],
      };
    },

    productPublish: async (_parent, { input }) => {
      const product = dummyProducts.get(input.id);
      if (!product) {
        return {
          product: null,
          userErrors: [
            { field: ["id"], message: "Product not found", code: "NOT_FOUND" },
          ],
        };
      }

      product.isPublished = true;
      product.publishedAt = new Date();
      product.updatedAt = new Date();

      return {
        product,
        userErrors: [],
      };
    },

    productUnpublish: async (_parent, { input }) => {
      const product = dummyProducts.get(input.id);
      if (!product) {
        return {
          product: null,
          userErrors: [
            { field: ["id"], message: "Product not found", code: "NOT_FOUND" },
          ],
        };
      }

      product.isPublished = false;
      product.publishedAt = null;
      product.updatedAt = new Date();

      return {
        product,
        userErrors: [],
      };
    },
  },
};
