import type { Resolvers, CustomersMutation } from "../generated/types.js";

// Queries
import { queryResolvers } from "./queries.js";

// Mutations
import { customerMutationResolvers } from "./mutations/customer.js";

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
      customersMutation: () => ({}) as CustomersMutation,
    },
  },

  // Queries
  queryResolvers,

  // Mutations by domain
  customerMutationResolvers,

  // Type resolvers
  typeResolvers
);
