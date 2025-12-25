import type { Resolvers } from "../generated/types.js";
import { resolveMembership } from "./types.js";
import type { ScopeIdentifier } from "../../../casbin/CasbinService.js";

export const membershipResolvers: Partial<Resolvers> = {
  Membership: {
    __resolveReference: async (reference, ctx, info) => {
      return resolveMembership(
        reference.domain as ScopeIdentifier,
        reference.organizationId,
        ctx,
        info
      );
    },
  },
};
