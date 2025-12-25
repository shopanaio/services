import type { Resolvers } from "../generated/types.js";
import { resolveOrganization } from "./types.js";

export const organizationResolvers: Partial<Resolvers> = {
  Query: {
    organizationQuery: () => ({}),
  },

  OrganizationQuery: {
    organization: async (_parent, { id }, ctx, info) => {
      return resolveOrganization(id, ctx, info);
    },
  },

  Organization: {
    __resolveReference: async (reference, ctx, info) => {
      return resolveOrganization(reference.id, ctx, info);
    },
  },
};
