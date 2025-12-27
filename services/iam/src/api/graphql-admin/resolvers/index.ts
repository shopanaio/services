import type { Resolvers } from "../generated/types.js";
import { QueryResolver } from "../../../resolvers/admin/QueryResolver.js";
import { MutationResolver } from "../../../resolvers/admin/MutationResolver.js";
import { UserResolver } from "../../../resolvers/admin/UserResolver.js";
import { typeResolvers } from "./types.js";

export const resolvers: Resolvers = {
  // Root resolvers - decorated with @ApolloQuery/@ApolloMutation
  // They return Proxy objects that handle Apollo resolver signature
  Query: QueryResolver as Resolvers["Query"],
  Mutation: MutationResolver as Resolvers["Mutation"],

  // Type resolvers with @ResolveReference decorator
  User: UserResolver as Resolvers["User"],

  // Type resolvers for scalar types and federation references
  ...typeResolvers,
};
