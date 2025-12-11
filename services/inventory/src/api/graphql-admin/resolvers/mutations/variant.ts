import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { parseGraphqlInfo } from "@shopana/type-resolver";
import {
  variantCreate,
  variantDelete,
  variantSetCost,
  variantSetDimensions,
  variantSetMedia,
  variantSetPricing,
  variantSetSku,
  variantSetStock,
  variantSetWeight,
} from "../../../../scripts/variant/index.js";
import { VariantResolver } from "../../../../resolvers/admin/index.js";
import type { Resolvers } from "../../generated/types.js";
import { noDatabaseError, requireContext } from "../utils.js";

export const variantMutationResolvers: Resolvers = {
  InventoryMutation: {
    variantCreate: async (_parent, { input }, ctx, info) => {
      if (!ctx.kernel) {
        return noDatabaseError({ variant: null });
      }

      const result = await ctx.kernel.executeScript(variantCreate, {
        productId: input.productId,
        options: input.variant.options.map((opt) => ({
          optionId: opt.optionId,
          optionValueId: opt.optionValueId,
        })),
        sku: input.variant.sku ?? undefined,
        externalSystem: input.variant.externalSystem ?? undefined,
        externalId: input.variant.externalId ?? undefined,
      });

      const variantFieldInfo = parseGraphqlInfo(info, "variant");

      return {
        variant: result.variant
          ? await VariantResolver.load(
              result.variant.id,
              variantFieldInfo,
              requireContext(ctx)
            )
          : null,
        userErrors: result.userErrors,
      };
    },

    variantDelete: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ deletedVariantId: null });
      }

      const result = await ctx.kernel.executeScript(variantDelete, {
        id: input.id,
        permanent: Boolean(input.permanent),
      });

      return {
        deletedVariantId: result.deletedVariantId ?? null,
        userErrors: result.userErrors,
      };
    },

    variantSetSku: async (_parent, { input }, ctx, info) => {
      if (!ctx.kernel) {
        return noDatabaseError({ variant: null });
      }

      const result = await ctx.kernel.executeScript(variantSetSku, {
        variantId: input.variantId,
        sku: input.sku,
      });

      const variantFieldInfo = parseGraphqlInfo(info, "variant");

      return {
        variant: result.variant
          ? await VariantResolver.load(
              result.variant.id,
              variantFieldInfo,
              requireContext(ctx)
            )
          : null,
        userErrors: result.userErrors,
      };
    },

    variantSetDimensions: async (_parent, { input }, ctx, info) => {
      if (!ctx.kernel) {
        return noDatabaseError({ variant: null });
      }

      const result = await ctx.kernel.executeScript(variantSetDimensions, {
        variantId: input.variantId,
        dimensions: {
          width: input.dimensions.width,
          length: input.dimensions.length,
          height: input.dimensions.height,
        },
      });

      const variantFieldInfo = parseGraphqlInfo(info, "variant");

      return {
        variant: result.variant
          ? await VariantResolver.load(
              result.variant.id,
              variantFieldInfo,
              requireContext(ctx)
            )
          : null,
        userErrors: result.userErrors,
      };
    },

    variantSetWeight: async (_parent, { input }, ctx, info) => {
      if (!ctx.kernel) {
        return noDatabaseError({ variant: null });
      }

      const result = await ctx.kernel.executeScript(variantSetWeight, {
        variantId: input.variantId,
        weight: {
          value: input.weight.value,
        },
      });

      const variantFieldInfo = parseGraphqlInfo(info, "variant");

      return {
        variant: result.variant
          ? await VariantResolver.load(
              result.variant.id,
              variantFieldInfo,
              requireContext(ctx)
            )
          : null,
        userErrors: result.userErrors,
      };
    },

    variantSetPricing: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ variant: null });
      }

      const result = await ctx.kernel.executeScript(variantSetPricing, {
        variantId: input.variantId,
        currency: input.currency,
        amountMinor: Number(input.amountMinor),
        compareAtMinor: input.compareAtMinor
          ? Number(input.compareAtMinor)
          : undefined,
      });

      return {
        variant: result.price ? { id: input.variantId } : null,
        userErrors: result.userErrors,
      };
    },

    variantSetCost: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ variant: null });
      }

      const result = await ctx.kernel.executeScript(variantSetCost, {
        variantId: input.variantId,
        currency: input.currency,
        unitCostMinor: Number(input.unitCostMinor),
      });

      return {
        variant: result.cost ? { id: input.variantId } : null,
        userErrors: result.userErrors,
      };
    },

    variantSetStock: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ variant: null });
      }

      const result = await ctx.kernel.executeScript(variantSetStock, {
        variantId: input.variantId,
        warehouseId: input.warehouseId,
        quantity: input.quantity,
      });

      return {
        variant: result.stock ? { id: input.variantId } : null,
        userErrors: result.userErrors,
      };
    },

    variantSetMedia: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ variant: null });
      }

      // Decode Global IDs to UUIDs
      const fileIds = input.fileIds.map((fileId) =>
        decodeGlobalIdByType(fileId, GlobalIdEntity.File)
      );

      const result = await ctx.kernel.executeScript(variantSetMedia, {
        variantId: input.variantId,
        fileIds,
      });

      return {
        variant: result.variant ? { id: result.variant.id } : null,
        userErrors: result.userErrors,
      };
    },
  },
};
