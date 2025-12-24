import type { Resolvers } from "../../generated/types.js";
import { CurrencySetDefaultScript } from "../../../../scripts/currency/CurrencySetDefaultScript.js";

export const currencyMutationResolvers: Partial<Resolvers> = {
  StoreMutation: {
    currencySetDefault: async (_parent, { input }, ctx) => {
      const result = await ctx.kernel.runScript(CurrencySetDefaultScript, {
        storeId: ctx.store.id,
        currency: input.currency,
      });

      return {
        success: result.success,
        userErrors: result.userErrors,
      };
    },
  },
};
