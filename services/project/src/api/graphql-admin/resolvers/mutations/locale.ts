import type { Resolvers } from "../../generated/types.js";
import { LocaleSetDefaultScript } from "../../../../scripts/locale/LocaleSetDefaultScript.js";

export const localeMutationResolvers: Partial<Resolvers> = {
  StoreMutation: {
    localeSetDefault: async (_parent, { input }, ctx) => {
      const result = await ctx.kernel.runScript(LocaleSetDefaultScript, {
        storeId: ctx.store.id,
        locale: input.locale,
      });

      return {
        success: result.success,
        userErrors: result.userErrors,
      };
    },
  },
};
