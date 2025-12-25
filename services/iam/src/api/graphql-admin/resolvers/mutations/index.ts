import type { Resolvers } from "../../generated/types.js";
import { authMutationResolvers } from "./auth.js";
import { userMutationResolvers } from "./user.js";
import { roleMutationResolvers } from "./role.js";
import { organizationMutationResolvers } from "./organization.js";

export const mutationResolvers: Partial<Resolvers> = {
  Mutation: {
    userMutation: () => ({}) as any,
    authMutation: () => ({}) as any,
    roleMutation: () => ({}) as any,
    organizationMutation: () => ({}) as any,
  },

  AuthMutation: {
    ...authMutationResolvers.AuthMutation,
  },

  UserMutation: {
    ...userMutationResolvers.UserMutation,
  },

  RoleMutation: {
    ...roleMutationResolvers.RoleMutation,
  },

  OrganizationMutation: {
    ...organizationMutationResolvers.OrganizationMutation,
  },
};
