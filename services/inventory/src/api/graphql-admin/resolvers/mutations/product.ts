import { parseGraphqlInfo } from "@shopana/type-executor";
import type { Resolvers, Product } from "../../generated/types.js";
import {
  ProductCreateScript,
  ProductUpdateScript,
  ProductDeleteScript,
  ProductPublishScript,
  ProductUnpublishScript,
} from "../../../../scripts/product/index.js";
import { ProductView } from "../../../../views/admin/index.js";
import { noDatabaseError, requireContext } from "../utils.js";

export const productMutationResolvers: Resolvers = {
  InventoryMutation: {
    productCreate: async (_parent, _args, ctx, info) => {
      if (!ctx.kernel) {
        return noDatabaseError({ product: null });
      }

      const result = await ctx.kernel.runScript(ProductCreateScript, {});

      const productFieldInfo = parseGraphqlInfo(info, "product");

      return {
        product: result.product
          ? ((await ProductView.load(
              result.product.id,
              productFieldInfo,
              requireContext(ctx)
            )) as Product)
          : null,
        userErrors: result.userErrors,
      };
    },

    productUpdate: async (_parent, { input }, ctx, info) => {
      if (!ctx.kernel) {
        return noDatabaseError({ product: null });
      }

      const result = await ctx.kernel.runScript(ProductUpdateScript, {
        id: input.id,
        handle: input.handle ?? undefined,
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

      const productFieldInfo = parseGraphqlInfo(info, "product");

      return {
        product: result.product
          ? ((await ProductView.load(
              result.product.id,
              productFieldInfo,
              requireContext(ctx)
            )) as Product)
          : null,
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

    productPublish: async (_parent, { input }, ctx, info) => {
      if (!ctx.kernel) {
        return noDatabaseError({ product: null });
      }

      const result = await ctx.kernel.runScript(ProductPublishScript, {
        id: input.id,
      });

      const productFieldInfo = parseGraphqlInfo(info, "product");

      return {
        product: result.product
          ? ((await ProductView.load(
              result.product.id,
              productFieldInfo,
              requireContext(ctx)
            )) as Product)
          : null,
        userErrors: result.userErrors,
      };
    },

    productUnpublish: async (_parent, { input }, ctx, info) => {
      if (!ctx.kernel) {
        return noDatabaseError({ product: null });
      }

      const result = await ctx.kernel.runScript(ProductUnpublishScript, {
        id: input.id,
      });

      const productFieldInfo = parseGraphqlInfo(info, "product");

      return {
        product: result.product
          ? ((await ProductView.load(
              result.product.id,
              productFieldInfo,
              requireContext(ctx)
            )) as Product)
          : null,
        userErrors: result.userErrors,
      };
    },
  },
};
