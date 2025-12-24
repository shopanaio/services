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
    // Members field resolver - gets store members from IAM
    members: async (
      parent: { id: string },
      _args: unknown,
      ctx: ServiceContext
    ) => {
      // Load store to get organizationId
      const store = await ctx.kernel
        .getServices()
        .repository.store.findById(parent.id);
      const organizationId = store?.organizationId ?? null;

      console.log("Resolving members for store:", JSON.stringify(parent));

      if (!organizationId) {
        return [];
      }

      const result = await ctx.kernel
        .getServices()
        .broker.call("iam.getMembersForDomain", {
          organizationId,
          domain: [["store", parent.id]],
        });

      if (!result || result.userErrors?.length > 0) {
        return [];
      }

      return result.members.map(
        (m: {
          userId: string;
          role: string;
          roleDisplayName?: string | null;
          roleIsSystem?: boolean;
          grantedAt?: Date;
          grantedBy?: string;
        }) => ({
          id: m.userId, // StoreMember id is the userId
          user: { __typename: "User", id: m.userId },
          role: {
            __typename: "Role",
            name: m.role,
            displayName: m.roleDisplayName ?? m.role,
            isSystem: m.roleIsSystem ?? false,
          },
          grantedAt: m.grantedAt ?? null,
          grantedBy: m.grantedBy
            ? { __typename: "User", id: m.grantedBy }
            : null,
        })
      );
    },
  },

  // StoreMember type resolver
  StoreMember: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: (parent: any) => {
      // Return federation reference
      const userId = parent.user?.id ?? parent.id;
      return { __typename: "User", id: userId };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    role: (parent: any) => {
      // Return federation reference to Role
      const roleName =
        typeof parent.role === "string" ? parent.role : parent.role?.name;
      return { __typename: "Role", name: roleName };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    grantedBy: (parent: any) => {
      if (!parent.grantedBy) return null;
      const grantedById =
        typeof parent.grantedBy === "string"
          ? parent.grantedBy
          : parent.grantedBy.id;
      return { __typename: "User", id: grantedById };
    },
  },

  // UserError interface resolver
  UserError: {
    __resolveType: () => "GenericUserError",
  },
};
