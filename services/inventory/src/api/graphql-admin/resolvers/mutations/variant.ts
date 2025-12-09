import type { Resolvers, Variant } from "../../generated/types.js";
import {
  variantCreate,
  variantDelete,
  variantSetSku,
  variantSetDimensions,
  variantSetWeight,
  variantSetPricing,
  variantSetCost,
  variantSetStock,
  variantSetMedia,
} from "../../../../scripts/variant/index.js";
import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { noDatabaseError } from "../utils.js";

export const variantMutationResolvers: Resolvers = {
  InventoryMutation: {
    variantCreate: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ variant: null });
      }

      const result = await ctx.kernel.executeScript(variantCreate, {
        // TODO: add required options to the input
        productId: input.productId,
        sku: input.variant?.sku,
      });

      return {
        variant: result.variant ?? null,
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

    variantSetSku: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ variant: null });
      }

      const result = await ctx.kernel.executeScript(variantSetSku, {
        variantId: input.variantId,
        sku: input.sku,
      });

      return {
        variant: result.variant ? ({ id: result.variant.id } as Variant) : null,
        userErrors: result.userErrors,
      };
    },

    variantSetDimensions: async (_parent, { input }, ctx) => {
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

      return {
        variant: result.variant ? ({ id: result.variant.id } as Variant) : null,
        userErrors: result.userErrors,
      };
    },

    variantSetWeight: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ variant: null });
      }

      const result = await ctx.kernel.executeScript(variantSetWeight, {
        variantId: input.variantId,
        weight: {
          value: input.weight.value,
        },
      });

      return {
        variant: result.variant ? ({ id: result.variant.id } as Variant) : null,

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
        variant: result.price ? ({ id: input.variantId } as Variant) : null,
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
        variant: result.cost ? ({ id: input.variantId } as Variant) : null,
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
        variant: result.stock ? ({ id: input.variantId } as Variant) : null,
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
        variant: result.variant ? ({ id: result.variant.id } as Variant) : null,
        userErrors: result.userErrors,
      };
    },
  },
};
