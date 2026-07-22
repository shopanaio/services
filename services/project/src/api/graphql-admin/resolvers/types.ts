import type { Resolvers } from "../generated/types.js";
import { LOCALE_INFO } from "@shopana/shared-references";

export const typeResolvers: Partial<Resolvers> = {
  // Locale type resolver
  Locale: {
    name: (parent) => {
      const code = parent.code as string as keyof typeof LOCALE_INFO;
      return LOCALE_INFO[code]?.name ?? parent.code;
    },
  },

  // UserError interface resolver
  UserError: {
    __resolveType: () => "GenericUserError",
  },
};
