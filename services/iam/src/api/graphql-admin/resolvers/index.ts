import { queryResolvers } from "./queries.js";
import { userMutationResolvers } from "./mutations/user.js";
import { roleMutationResolvers } from "./mutations/role.js";
import { roleResolvers } from "./role.js";

export const resolvers = {
  ...queryResolvers,
  ...userMutationResolvers,
  ...roleMutationResolvers,
  ...roleResolvers,
  // Merge Query resolvers from queries and role
  Query: {
    ...queryResolvers.Query,
    ...roleResolvers.Query,
  },
  // Merge Mutation resolvers from both user and role
  Mutation: {
    ...userMutationResolvers.Mutation,
    ...roleMutationResolvers.Mutation,
  },
  // Merge User resolvers (federation + role field)
  User: {
    ...queryResolvers.User,
    ...roleResolvers.User,
  },
  // Project entity extension (from project-service)
  Project: {
    ...roleResolvers.Project,
  },
  // ProjectMember type resolvers
  ProjectMember: {
    ...roleResolvers.ProjectMember,
  },
};
