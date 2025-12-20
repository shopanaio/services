import type { Resolvers, ProjectMutation } from "../generated/types.js";
import {
  CURRENCY_INFO,
  LOCALE_INFO,
  type CurrencyCode,
  type LocaleCode,
} from "@shopana/shared-references";

// Queries
import { queryResolvers } from "./queries.js";

// Mutations
import { projectMutationResolvers } from "./mutations/project.js";
import { localeMutationResolvers } from "./mutations/locale.js";
import { currencyMutationResolvers } from "./mutations/currency.js";
import { apiKeyMutationResolvers } from "./mutations/apiKey.js";

/**
 * Deep merge resolvers - combines multiple resolver objects into one
 */
function mergeResolvers(...resolversList: Partial<Resolvers>[]): Resolvers {
  const merged: Record<string, Record<string, unknown>> = {};

  for (const resolvers of resolversList) {
    for (const [typeName, typeResolvers] of Object.entries(resolvers)) {
      if (!merged[typeName]) {
        merged[typeName] = {};
      }
      Object.assign(merged[typeName], typeResolvers);
    }
  }

  return merged as Resolvers;
}

export const resolvers: Resolvers = mergeResolvers(
  // Base mutation wrapper
  {
    Mutation: {
      projectMutation: () => ({}) as ProjectMutation,
    },
  },

  // Type resolvers
  {
    Currency: {
      name: (parent) => CURRENCY_INFO[parent.code as CurrencyCode]?.name ?? parent.code,
    },
    Locale: {
      name: (parent) => LOCALE_INFO[parent.code as LocaleCode]?.name ?? parent.code,
    },
    Project: {
      locales: async (parent, _args, ctx) => {
        const locales = await ctx.kernel.repository?.locale.findByProjectId(parent.id);
        return locales?.map((l) => l.code as LocaleCode) ?? [];
      },
      currencies: async (parent, _args, ctx) => {
        const currencies = await ctx.kernel.repository?.currency.findByProjectId(parent.id);
        return currencies?.map((c) => c.code as CurrencyCode) ?? [];
      },
    },
    UserError: {
      __resolveType: () => "GenericUserError",
    },
  },

  // Queries
  queryResolvers,

  // Mutations by domain
  projectMutationResolvers,
  localeMutationResolvers,
  currencyMutationResolvers,
  apiKeyMutationResolvers
);
