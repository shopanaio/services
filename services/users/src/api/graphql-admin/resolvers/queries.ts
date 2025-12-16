import { parseGraphqlInfo } from "@shopana/type-resolver";
import { UserConnectionResolver } from "../../../resolvers/admin/UserConnectionResolver.js";
import { UserResolver } from "../../../resolvers/admin/UserResolver.js";
import type { Resolvers } from "../generated/types.js";
import { requireContext } from "./utils.js";

export const queryResolvers: Partial<Resolvers> = {
  Query: {
    usersQuery: (() => ({})) as any,
  },

  UsersQuery: {
    node: async (_parent, { id }, ctx, info) => {
      return UserResolver.load(
        id,
        parseGraphqlInfo(info),
        requireContext(ctx)
      );
    },

    nodes: async (_parent, { ids }, ctx, info) => {
      return UserResolver.loadMany(
        ids,
        parseGraphqlInfo(info),
        requireContext(ctx)
      );
    },

    user: async (_parent, { id }, ctx, info) => {
      return UserResolver.load(
        id,
        parseGraphqlInfo(info),
        requireContext(ctx)
      );
    },

    users: async (_parent, args, ctx, info) => {
      return UserConnectionResolver.load(
        args,
        parseGraphqlInfo(info),
        requireContext(ctx)
      );
    },
  },
};
