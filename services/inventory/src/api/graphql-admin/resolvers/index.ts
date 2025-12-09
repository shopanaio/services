import type { Resolvers } from "../generated/types.js";

// Queries
import { queryResolvers } from "./queries.js";

// Mutations
import { productMutationResolvers } from "./mutations/product.js";
import { variantMutationResolvers } from "./mutations/variant.js";
import { warehouseMutationResolvers } from "./mutations/warehouse.js";
import { optionMutationResolvers } from "./mutations/option.js";
import { featureMutationResolvers } from "./mutations/feature.js";

// Type resolvers
import { typeResolvers } from "./types.js";

// TODO: Use DataLoader for batching and caching database queries to avoid N+1 problem
// TODO: Use @upstash/redis for caching complete Product and Variant objects

/**
 * Deep merge resolvers - combines multiple resolver objects into one
 */
function mergeResolvers(...resolversList: Resolvers[]): Resolvers {
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
      inventoryMutation: () => ({}),
    },
  },

  // Queries
  queryResolvers,

  // Mutations by domain
  productMutationResolvers,
  variantMutationResolvers,
  warehouseMutationResolvers,
  optionMutationResolvers,
  featureMutationResolvers,

  // Type resolvers
  typeResolvers
);
