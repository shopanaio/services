import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { GraphQLResolveInfo } from "graphql";
import type { ServiceContext } from "../../../context/index.js";
import { StoreResolver } from "../../../resolvers/admin/StoreType.js";
import type { Resolvers } from "../generated/types.js";
import { requireContext } from "./utils.js";
import { CURRENCY_INFO, LOCALE_INFO } from "@shopana/shared-references";

/**
 * Resolves store using StoreResolver
 */
export async function resolveStore(
  storeId: string,
  ctx: ServiceContext,
  info: GraphQLResolveInfo
) {
  return StoreResolver.load(
    storeId,
    parseGraphqlInfo(info),
    requireContext(ctx)
  );
}

export const typeResolvers: Partial<Resolvers> = {
  // Currency type resolver
  Currency: {
    name: (parent) => {
      const code = parent.code as string as keyof typeof CURRENCY_INFO;
      return CURRENCY_INFO[code]?.name ?? parent.code;
    },
  },

  // Locale type resolver
  Locale: {
    name: (parent) => {
      const code = parent.code as string as keyof typeof LOCALE_INFO;
      return LOCALE_INFO[code]?.name ?? parent.code;
    },
  },

  // Store type resolver - uses StoreResolver for __resolveReference
  Store: {
    __resolveReference: async (
      reference: { id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): Promise<any> => {
      return resolveStore(reference.id, ctx, info);
    },
    // Organization field resolver - returns federation reference
    organization: async (
      parent: { id: string },
      _args: unknown,
      ctx: ServiceContext
    ) => {
      // Load store to get organizationId
      const store = await ctx.kernel
        .getServices()
        .repository.store.findById(parent.id);
      const organizationId = store?.organizationId ?? null;

      if (!organizationId) {
        return null;
      }
      // Return federation reference - gateway will resolve from IAM service
      return { __typename: "Organization", id: organizationId };
    },
    // Membership field resolver - returns Federation reference to IAM Membership
    membership: (parent: { id: string }) => {
      // Return Federation reference - IAM resolves by domain (store.id)
      return { __typename: "Membership", domain: parent.id };
    },
  },

  // UserError interface resolver
  UserError: {
    __resolveType: () => "GenericUserError",
  },
};
