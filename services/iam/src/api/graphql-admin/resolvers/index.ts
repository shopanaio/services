import { queryResolvers } from "./queries.js";
import { userMutationResolvers } from "./mutations/user.js";
import { roleMutationResolvers } from "./mutations/role.js";
import { roleResolvers } from "./role.js";

export const resolvers = {
  ...queryResolvers,
  ...userMutationResolvers,
  ...roleMutationResolvers,
  ...roleResolvers,
  // Merge Mutation resolvers from both user and role
  Mutation: {
    ...userMutationResolvers.Mutation,
    ...roleMutationResolvers.Mutation,
  },
};
