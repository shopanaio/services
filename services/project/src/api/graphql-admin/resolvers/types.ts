import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { GraphQLResolveInfo } from "graphql";
import type { ServiceContext } from "../../../context/index.js";
import { StoreResolver } from "../../../resolvers/admin/StoreResolver.js";
import type { Store } from "../../../repositories/store/StoreRepository.js";
import type { Resolvers } from "../generated/types.js";
import { CURRENCY_INFO, LOCALE_INFO } from "@shopana/shared-references";

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
      const store = await ctx.kernel
        .getServices()
        .repository.store.findById(reference.id);

      if (!store) {
        return null;
      }

      return StoreResolver.load(store, parseGraphqlInfo(info), ctx);
    },
    // Organization field resolver - returns federation reference
    organization: async (parent) => {
      const store = parent as unknown as Store;
      if (!store.organizationId) {
        return null;
      }
      // Return federation reference - gateway will resolve from IAM service
      return { __typename: "Organization" as const, id: store.organizationId };
    },
    // Membership field resolver - returns Federation reference to IAM Membership
    membership: async (parent) => {
      const store = parent as unknown as Store;
      if (!store.organizationId) {
        throw new Error(`Store ${store.id} has no organizationId`);
      }

      // Return Federation reference with domain format "store:uuid"
      return {
        __typename: "Membership" as const,
        domain: `store:${store.id}`,
        organizationId: store.organizationId,
      };
    },
  },

  // UserError interface resolver
  UserError: {
    __resolveType: () => "GenericUserError",
  },
};
