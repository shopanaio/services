import type { Resolvers } from "../../generated/types.js";
import { LocaleUpdateScript } from "../../../../scripts/locale/LocaleUpdateScript.js";
import { LocaleSetDefaultScript } from "../../../../scripts/locale/LocaleSetDefaultScript.js";

export const localeMutationResolvers: Partial<Resolvers> = {
  ProjectMutation: {
    localesUpdate: async (_parent, { input }, ctx) => {
      const result = await ctx.kernel.runScript(LocaleUpdateScript, {
        projectId: ctx.project.id,
        create: input.create,
        update: input.update,
        delete: input.delete,
      });

      return {
        success: result.success,
        userErrors: result.userErrors,
      };
    },

    localeSetDefault: async (_parent, { input }, ctx) => {
      const result = await ctx.kernel.runScript(LocaleSetDefaultScript, {
        projectId: ctx.project.id,
        locale: input.locale,
      });

      return {
        success: result.success,
        userErrors: result.userErrors,
      };
    },
  },
};
