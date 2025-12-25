import type { Resolvers } from "../../generated/types.js";

export const roleMutationResolvers: Partial<Resolvers> = {
  RoleMutation: {
    roleCreate: async (_parent, { input: _input }, _ctx) => {
      // Create a new role with permissions for the organization
      throw new Error("Not implemented");
    },

    roleUpdate: async (_parent, { input: _input }, _ctx) => {
      // Update an existing role's display name, description, or permissions
      throw new Error("Not implemented");
    },

    roleDelete: async (_parent, { input: _input }, _ctx) => {
      // Delete a custom role from the organization
      throw new Error("Not implemented");
    },
  },
};
