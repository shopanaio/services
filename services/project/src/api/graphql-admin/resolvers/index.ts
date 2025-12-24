import type { Resolvers, StoreMutation } from "../generated/types.js";

// Queries
import { queryResolvers } from "./queries.js";

// Type resolvers
import { typeResolvers } from "./types.js";

// Mutations
import { storeMutationResolvers } from "./mutations/store.js";
import { localeMutationResolvers } from "./mutations/locale.js";
import { currencyMutationResolvers } from "./mutations/currency.js";
import { apiKeyMutationResolvers } from "./mutations/apiKey.js";
import { storeMemberMutationResolvers } from "./mutations/storeMember.js";

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
      storeMutation: () => ({}) as StoreMutation,
    },
  },

  // Type resolvers
  typeResolvers,

  // Queries
  queryResolvers,

  // Mutations by domain
  storeMutationResolvers,
  localeMutationResolvers,
  currencyMutationResolvers,
  apiKeyMutationResolvers,
  storeMemberMutationResolvers
);
