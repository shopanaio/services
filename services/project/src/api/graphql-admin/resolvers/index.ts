import type { Resolvers } from "../generated/types.js";
import { QueryResolver } from "../../../resolvers/admin/QueryResolver.js";
import { MutationResolver } from "../../../resolvers/admin/MutationResolver.js";
import { typeResolvers } from "./types.js";

export const resolvers: Resolvers = {
  // Root resolvers - decorated with @ApolloQuery/@ApolloMutation
  // They return Proxy objects that handle Apollo resolver signature
  Query: QueryResolver as unknown as Resolvers["Query"],
  Mutation: MutationResolver as unknown as Resolvers["Mutation"],

  // Type resolvers for scalar types and federation references
  ...typeResolvers,
};
