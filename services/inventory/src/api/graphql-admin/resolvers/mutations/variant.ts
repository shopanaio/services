import type { Resolvers } from "../../generated/types.js";
import {
  variantCreate,
  variantSetDimensions,
  variantSetWeight,
  variantSetPricing,
  variantSetCost,
  variantSetStock,
  variantSetMedia,
} from "../../../../scripts/variant/index.js";

export const variantMutationResolvers: Resolvers = {
  InventoryMutation: {
    variantCreate: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return {
          variant: null,
          userErrors: [
            { message: "Database not configured", code: "NO_DATABASE" },
          ],
        };
      }

      const result = await ctx.kernel.executeScript(variantCreate, {
        productId: input.productId,
        sku: input.variant?.sku ?? undefined,
      });

      return {
        variant: result.variant ?? null,
        userErrors: result.userErrors,
      };
    },

    variantDelete: async () => {
      throw new Error("Not implemented");
    },

    variantSetSku: async () => {
      throw new Error("Not implemented");
    },

    variantSetDimensions: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return {
          variant: null,
          userErrors: [
            { message: "Database not configured", code: "NO_DATABASE" },
          ],
        };
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
        variant: result.variant ?? null,
        userErrors: result.userErrors,
      };
    },

    variantSetWeight: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return {
          variant: null,
          userErrors: [
            { message: "Database not configured", code: "NO_DATABASE" },
          ],
        };
      }

      const result = await ctx.kernel.executeScript(variantSetWeight, {
        variantId: input.variantId,
        weight: {
          value: input.weight.value,
        },
      });

      return {
        variant: result.variant ?? null,
        userErrors: result.userErrors,
      };
    },

    variantSetPricing: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return {
          price: null,
          userErrors: [
            { message: "Database not configured", code: "NO_DATABASE" },
          ],
        };
      }

      const result = await ctx.kernel.executeScript(variantSetPricing, {
        variantId: input.variantId,
        currency: input.currency,
        amountMinor: Number(input.amountMinor),
        compareAtMinor: input.compareAtMinor ? Number(input.compareAtMinor) : undefined,
      });

      return {
        price: result.price ?? null,
        userErrors: result.userErrors,
      };
    },

    variantSetCost: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return {
          cost: null,
          userErrors: [
            { message: "Database not configured", code: "NO_DATABASE" },
          ],
        };
      }

      const result = await ctx.kernel.executeScript(variantSetCost, {
        variantId: input.variantId,
        currency: input.currency,
        unitCostMinor: Number(input.unitCostMinor),
      });

      return {
        cost: result.cost ?? null,
        userErrors: result.userErrors,
      };
    },

    variantSetStock: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return {
          stock: null,
          userErrors: [
            { message: "Database not configured", code: "NO_DATABASE" },
          ],
        };
      }

      const result = await ctx.kernel.executeScript(variantSetStock, {
        variantId: input.variantId,
        warehouseId: input.warehouseId,
        quantity: input.quantity,
      });

      return {
        stock: result.stock ?? null,
        userErrors: result.userErrors,
      };
    },

    variantSetMedia: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return {
          variant: null,
          userErrors: [
            { message: "Database not configured", code: "NO_DATABASE" },
          ],
        };
      }

      const result = await ctx.kernel.executeScript(variantSetMedia, {
        variantId: input.variantId,
        fileIds: input.fileIds,
      });

      return {
        variant: result.variant ?? null,
        userErrors: result.userErrors,
      };
    },
  },
};
