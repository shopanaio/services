import { QueryResolver } from "../../../resolvers/admin/QueryResolver.js";
import { MutationResolver } from "../../../resolvers/admin/MutationResolver.js";
import { UserResolver } from "../../../resolvers/admin/UserResolver.js";
import { OrganizationResolver } from "../../../resolvers/admin/OrganizationResolver.js";
import { SessionResolver } from "../../../resolvers/admin/SessionResolver.js";
import { typeResolvers } from "./types.js";

export const resolvers = {
  // Root resolvers - decorated with @ApolloQuery/@ApolloMutation
  // They return Proxy objects that handle Apollo resolver signature
  Query: QueryResolver,
  Mutation: MutationResolver,

  // Type resolvers with @ResolveReference decorator
  User: UserResolver,
  Organization: OrganizationResolver,
  Session: SessionResolver,

  // Type resolvers for scalars, interfaces, and federation references
  // (includes Membership with __resolveReference)
  ...typeResolvers,
};
