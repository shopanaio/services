import { queryResolvers } from "./queries.js";
import { roleResolvers } from "./role.js";
import { organizationResolvers } from "./organization.js";
import { membershipResolvers } from "./membership.js";
import { mutationResolvers } from "./mutations/index.js";

export const resolvers = {
  ...queryResolvers,
  ...roleResolvers,
  ...organizationResolvers,
  ...membershipResolvers,
  Query: {
    ...queryResolvers.Query,
    ...organizationResolvers.Query,
  },
  Mutation: {
    ...mutationResolvers.Mutation,
  },
  UserQuery: {
    ...queryResolvers.UserQuery,
    ...roleResolvers.UserQuery,
  },
  User: {
    ...queryResolvers.User,
    ...roleResolvers.User,
  },
  AuthMutation: {
    ...mutationResolvers.AuthMutation,
  },
  UserMutation: {
    ...mutationResolvers.UserMutation,
  },
  RoleMutation: {
    ...mutationResolvers.RoleMutation,
  },
  Role: {
    ...roleResolvers.Role,
  },
  OrganizationQuery: {
    ...organizationResolvers.OrganizationQuery,
  },
  Organization: {
    ...organizationResolvers.Organization,
  },
  OrganizationMutation: {
    ...organizationResolvers.OrganizationMutation,
  },
  Member: {
    ...organizationResolvers.Member,
  },
  Membership: {
    ...membershipResolvers.Membership,
  },
};
