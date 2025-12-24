import { queryResolvers } from "./queries.js";
import { userMutationResolvers } from "./mutations/user.js";
import { roleMutationResolvers } from "./mutations/role.js";
import { roleResolvers } from "./role.js";
import { organizationResolvers } from "./organization.js";
import { membershipResolvers } from "./membership.js";

export const resolvers = {
  ...queryResolvers,
  ...userMutationResolvers,
  ...roleMutationResolvers,
  ...roleResolvers,
  ...organizationResolvers,
  ...membershipResolvers,
  // Merge Query resolvers from queries and organization
  Query: {
    ...queryResolvers.Query,
    ...organizationResolvers.Query,
  },
  // Merge Mutation resolvers from user, role, and organization
  Mutation: {
    ...userMutationResolvers.Mutation,
    ...roleMutationResolvers.Mutation,
    ...organizationResolvers.Mutation,
  },
  // Merge UserQuery resolvers (current + authorize)
  UserQuery: {
    ...queryResolvers.UserQuery,
    ...roleResolvers.UserQuery,
  },
  // Merge User resolvers (federation + role field)
  User: {
    ...queryResolvers.User,
    ...roleResolvers.User,
  },
  // AuthMutation type resolvers
  AuthMutation: {
    ...userMutationResolvers.AuthMutation,
  },
  // Role type resolver (federation)
  Role: {
    ...roleResolvers.Role,
  },
  // Organization type resolvers
  Organization: {
    ...organizationResolvers.Organization,
  },
  // OrganizationMutation type resolvers
  OrganizationMutation: {
    ...organizationResolvers.OrganizationMutation,
  },
  // Member type resolvers (unified for org and store levels)
  Member: {
    ...organizationResolvers.Member,
  },
  // Membership type resolvers (federation)
  Membership: {
    ...membershipResolvers.Membership,
  },
};
