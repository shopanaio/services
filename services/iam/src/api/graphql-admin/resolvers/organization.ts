import type { Resolvers } from "../generated/types.js";

export const organizationResolvers: Partial<Resolvers> = {
  Query: {
    organizationQuery: () => ({} as any),
  },

  OrganizationQuery: {
    organization: async (_parent, { id: _id }, _ctx) => {
      // Get organization by ID
      throw new Error("Not implemented");
    },
  },

  Organization: {},

  Member: {
    __resolveReference: async (_reference, _ctx) => {
      // Resolve Member by id for Federation
      throw new Error("Not implemented");
    },
  },
};
