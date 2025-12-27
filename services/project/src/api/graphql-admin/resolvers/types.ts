import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { GraphQLResolveInfo } from "graphql";
import type { ServiceContext } from "../../../context/index.js";
import { StoreResolver } from "../../../resolvers/admin/StoreResolver.js";
import type { Store } from "../../../repositories/store/StoreRepository.js";
import type { Resolvers } from "../generated/types.js";
import { CURRENCY_INFO, LOCALE_INFO } from "@shopana/shared-references";

export const typeResolvers: Partial<Resolvers> = {
  // Currency type resolver
  Currency: {
    name: (parent) => {
      const code = parent.code as string as keyof typeof CURRENCY_INFO;
      return CURRENCY_INFO[code]?.name ?? parent.code;
    },
  },

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
