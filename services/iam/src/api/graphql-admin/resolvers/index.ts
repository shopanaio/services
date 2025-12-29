import { QueryResolver } from "../../../resolvers/admin/QueryResolver.js";
import { MutationResolver } from "../../../resolvers/admin/MutationResolver.js";
import { UserResolver } from "../../../resolvers/admin/UserResolver.js";
import { OrganizationResolver } from "../../../resolvers/admin/OrganizationResolver.js";
import { MembershipResolver } from "../../../resolvers/admin/MembershipResolver.js";
import { typeResolvers } from "./types.js";

export const resolvers = {
  // Root resolvers - decorated with @ApolloQuery/@ApolloMutation
  // They return Proxy objects that handle Apollo resolver signature
  Query: QueryResolver,
  Mutation: MutationResolver,

  // Type resolvers with @ResolveReference decorator
  User: UserResolver,
  Organization: OrganizationResolver,
  Membership: MembershipResolver,

  // Type resolvers for scalar types and federation references
  ...typeResolvers,
};
