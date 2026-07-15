import type { Resolvers } from "../../../resolvers/admin/generated/types.js";

export const typeResolvers: Partial<Resolvers> = {
  UserError: {
    __resolveType: () => "GenericUserError",
  },
};
