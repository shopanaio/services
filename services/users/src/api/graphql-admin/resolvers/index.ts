import type { Resolvers, UsersMutation } from "../generated/types.js";

// Queries
import { queryResolvers } from "./queries.js";

// Mutations
import { userMutationResolvers } from "./mutations/user.js";

// Type resolvers
import { typeResolvers } from "./types.js";

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
      usersMutation: () => ({}) as UsersMutation,
    },
  },

  // Queries
  queryResolvers,

  // Mutations by domain
  userMutationResolvers,

  // Type resolvers
  typeResolvers
);
