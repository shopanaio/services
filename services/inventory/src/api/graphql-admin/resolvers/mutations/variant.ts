import type { Resolvers } from "../../generated/types.js";
import {
  variantSetDimensions,
  variantSetWeight,
} from "../../../../scripts/variant/index.js";

export const variantMutationResolvers: Resolvers = {
  InventoryMutation: {
    variantCreate: async () => {
      throw new Error("Not implemented");
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

    variantSetPricing: async () => {
      throw new Error("Not implemented");
    },

    variantSetCost: async () => {
      throw new Error("Not implemented");
    },

    variantSetStock: async () => {
      throw new Error("Not implemented");
    },

    variantSetMedia: async () => {
      throw new Error("Not implemented");
    },
  },
};
