import type { Resolvers } from "../../generated/types.js";
import { CurrencyFormatUpdateScript } from "../../../../scripts/currency/CurrencyFormatUpdateScript.js";
import { CurrencySetDefaultScript } from "../../../../scripts/currency/CurrencySetDefaultScript.js";

export const currencyMutationResolvers: Partial<Resolvers> = {
  ProjectMutation: {
    currencyFormatUpdate: async (_parent, { input }, ctx) => {
      const result = await ctx.kernel.runScript(CurrencyFormatUpdateScript, {
        projectId: ctx.project.id,
        code: input.code,
        decimalPlaces: input.decimalPlaces ?? undefined,
        symbolLeft: input.symbolLeft ?? undefined,
        symbolRight: input.symbolRight ?? undefined,
        decimalSeparator: input.decimalSeparator ?? undefined,
        thousandsSeparator: input.thousandsSeparator ?? undefined,
      });

      return {
        success: result.success,
        userErrors: result.userErrors,
      };
    },

    currencySetDefault: async (_parent, { input }, ctx) => {
      const result = await ctx.kernel.runScript(CurrencySetDefaultScript, {
        projectId: ctx.project.id,
        currency: input.currency,
      });

      return {
        success: result.success,
        userErrors: result.userErrors,
      };
    },
  },
};
