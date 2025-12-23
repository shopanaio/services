import { queryResolvers } from "./queries.js";
import { userMutationResolvers } from "./mutations/user.js";
import { roleMutationResolvers } from "./mutations/role.js";
import { roleResolvers } from "./role.js";
import { organizationResolvers } from "./organization.js";

export const resolvers = {
  ...queryResolvers,
  ...userMutationResolvers,
  ...roleMutationResolvers,
  ...roleResolvers,
  ...organizationResolvers,
  // Merge Query resolvers from queries, role, and organization
  Query: {
    ...queryResolvers.Query,
    ...roleResolvers.Query,
    ...organizationResolvers.Query,
  },
  // Merge Mutation resolvers from user, role, and organization
  Mutation: {
    ...userMutationResolvers.Mutation,
    ...roleMutationResolvers.Mutation,
    ...organizationResolvers.Mutation,
  },
  // Merge User resolvers (federation + role field)
  User: {
    ...queryResolvers.User,
    ...roleResolvers.User,
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
  // Member type resolvers
  Member: {
    ...organizationResolvers.Member,
  },
};
