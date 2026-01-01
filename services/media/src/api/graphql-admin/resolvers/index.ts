import { QueryResolver } from "../../../resolvers/admin/QueryResolver.js";
import { MutationResolver } from "../../../resolvers/admin/MutationResolver.js";
import { typeResolvers } from "./types.js";

export const resolvers = {
  // Root resolvers - decorated with @ApolloQuery/@ApolloMutation
  // They return Proxy objects that handle Apollo resolver signature
  Query: QueryResolver,
  Mutation: MutationResolver,

  // Type resolvers for scalars, interfaces, and federation references
  ...typeResolvers,
};
