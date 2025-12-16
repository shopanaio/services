import { parseGraphqlInfo } from "@shopana/type-resolver";
import { CustomerConnectionResolver } from "../../../resolvers/admin/CustomerConnectionResolver.js";
import { CustomerResolver } from "../../../resolvers/admin/CustomerResolver.js";
import type { Resolvers } from "../generated/types.js";
import { requireContext } from "./utils.js";

export const queryResolvers: Partial<Resolvers> = {
  Query: {
    customersQuery: (() => ({})) as any,
  },

  CustomersQuery: {
    node: async (_parent, { id }, ctx, info) => {
      return CustomerResolver.load(
        id,
        parseGraphqlInfo(info),
        requireContext(ctx)
      );
    },

    nodes: async (_parent, { ids }, ctx, info) => {
      return CustomerResolver.loadMany(
        ids,
        parseGraphqlInfo(info),
        requireContext(ctx)
      );
    },

    customer: async (_parent, { id }, ctx, info) => {
      return CustomerResolver.load(
        id,
        parseGraphqlInfo(info),
        requireContext(ctx)
      );
    },

    customers: async (_parent, args, ctx, info) => {
      return CustomerConnectionResolver.load(
        args,
        parseGraphqlInfo(info),
        requireContext(ctx)
      );
    },
  },
};
