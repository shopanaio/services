import type { Resolvers } from "../../generated/types.js";
import { CurrencySetDefaultScript } from "../../../../scripts/currency/CurrencySetDefaultScript.js";

export const currencyMutationResolvers: Partial<Resolvers> = {
  ProjectMutation: {
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
